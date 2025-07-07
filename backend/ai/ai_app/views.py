import json
from django.http import JsonResponse
from django.shortcuts import render
from ai_app.models import Video
from pytubefix import YouTube

# Create your views here.
import re
import torch
from django.shortcuts import render
from youtube_transcript_api import YouTubeTranscriptApi
from transformers import AutoTokenizer, AutoModelForCausalLM
from django.views.decorators.csrf import ensure_csrf_cookie

# Load model and tokenizer once when server starts
device = "cuda" if torch.cuda.is_available() else "cpu"
model_name = "meta-llama/Llama-3.2-1B-Instruct"  # Replace with your model
tokenizer = AutoTokenizer.from_pretrained(model_name, use_safetensors=True)
tokenizer.pad_token_id = tokenizer.eos_token_id
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16 if device == "cuda" else torch.float32,
    use_safetensors=True,
    device_map=device,
)
device = "cuda" if torch.cuda.is_available() else "cpu"
print("Using device:", device)

def generate_ai_response(conversation):
    prompt = tokenizer.apply_chat_template(conversation, tokenize=False)
    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        output = model.generate(
            **inputs,
            do_sample=True,
            max_new_tokens=1500,
        )

    return tokenizer.decode(output[0][len(inputs.input_ids[0]):], skip_special_tokens=True).lstrip("assistant:").strip()

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'message': 'CSRF cookie set'})

def quiz(request):
    if request.method != "POST":
        return JsonResponse({"data": "Invalid request method. Please use POST."})

    print("Generating quiz...")

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"data": "Invalid JSON."})
    
    
    url = body.get("url", "").strip()
    print(url)
    
    yt = YouTube(url)

    pattern = r"(?:v=|\/)([0-9A-Za-z_-]{11})"
    match = re.search(pattern, url)
    if not match:
        return JsonResponse({"data": "Invalid Input. Please provide a valid YouTube URL."})

    video_id = match.group(1)


    try:
        transcript = YouTubeTranscriptApi().fetch(video_id)
        input_text = " ".join([entry.text for entry in transcript])
    except Exception as e:
        return JsonResponse({"data": "Error."})

    # Prepare conversation for quiz
    conversation_quiz = [
    {
        "role": "system",
        "content": (
            "You are an expert at transforming video transcripts into educational quizzes.\n\n"
            "From the provided transcript, extract important concepts, facts, or explanations and turn them into clear, concise Q&A quiz items.\n\n"
            "Each quiz item MUST begin with 'Question:' followed by a single-line question, and then 'Answer:' followed by a single-line correct answer.\n"
            "Do NOT abbreviate these labels (i.e., do not use 'Q:' or 'A:').\n\n"
            "**Important:** If the transcript already contains text like 'Q:', 'A:', 'Question:', or 'Answer:', REMOVE those prefixes and reformat cleanly.\n\n"
            "Focus on creating meaningful, challenging, and informative quiz questions that test understanding of key points, definitions, explanations, and examples.\n"
            "Avoid summaries or outlines. Only produce quiz questions in strict Q&A form."
        ),
    },
    {"role": "user", "content": input_text},
    ]


    processed_quiz = generate_ai_response(conversation_quiz)

    save_video_data(video_id, yt.title, summary=None, quiz=processed_quiz)

    return JsonResponse({"quiz": processed_quiz})

def generate_summary(request):
    if request.method != "POST":
        return JsonResponse({"data": "Invalid request method. Please use POST."})
    
    print("Generating summary...")
    
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"data": "Invalid JSON."})
    
    
    url = body.get("url", "").strip()
    print(url)
    yt = YouTube(url)

    
    pattern = r"(?:v=|\/)([0-9A-Za-z_-]{11})"
    match = re.search(pattern, url)
    if not match:
        return JsonResponse({"data": "Invalid Input. Please provide a valid YouTube URL."})

    video_id = match.group(1)

    try:
        transcript = YouTubeTranscriptApi().fetch(video_id)
        input_text = " ".join([entry.text for entry in transcript])
    except Exception as e:
        return JsonResponse({"data": "Error."})
 
    
    
    # Prepare conversation for summary
    conversation_summary = [
    {
        "role": "system",
        "content": (
            "You are an expert at analyzing educational video transcripts and transforming them into detailed, hierarchical summaries.\n\n"
            "Your task is to create a highly structured, easy-to-follow summary that captures the full depth of the video's content. Follow these guidelines carefully:\n\n"
            "1. Identify all major topics, subtopics, and key explanations or demonstrations presented in the video.\n"
            "2. Organize the content into a numbered outline, using proper hierarchy (main points, subpoints, and nested explanations).\n"
            "3. For each point, write a \\*\\*short heading\\*\\* followed by a \\*\\*concise but informative paragraph\\*\\* that explains what was discussed.\n"
            "4. Use full sentences and avoid vague or generic summaries — every point should contain meaningful information from the video.\n"
            "5. Do not generate lists of keywords, simple bullet points, or summaries that only describe the structure of the video. Your summary should reflect the \\*\\*substance\\*\\* of the content.\n"
            "6. Focus only on what is taught or explained in the video — exclude filler like greetings, self-promotion, or off-topic comments.\n"
            "7. Aim to be accurate, educational, and complete — imagine the reader did not watch the video but needs to understand everything important from it.\n\n"
            "Output Format:\n"
            "- A hierarchical summary with clear numbered structure.\n"
            "- Each section should be rich in educational content, not just titles."
        ),
    },
    {"role": "user", "content": input_text},
    ]

    processed_summary = generate_ai_response(conversation_summary)
    transcript_str = json.dumps(transcript.to_raw_data())
    save_video_data(video_id, yt.title, processed_summary, quiz=None, transcript=transcript_str)
    return JsonResponse({"summary": processed_summary, "transcript": transcript.to_raw_data()})


def get_videos(request):
    videos = Video.objects.all().values()
    videos_list = list(videos)
    return JsonResponse({"videos": videos_list})

def save_video_data(video_id, title, summary=None, quiz=None, transcript=None):
    video, created = Video.objects.get_or_create(
        video_id=video_id,
        defaults={"title": title, "summary_text": summary, "quiz_text": quiz, "transcript": transcript}
    )
    
    if not created:
        updated = False
        if summary is not None:
            video.summary_text = summary
            updated = True
        if quiz is not None:
            video.quiz_text = quiz
            updated = True
        if title is not None:
            video.title = title
            updated = True
        if transcript is not None:
            video.transcript = transcript
            updated = True
        if updated:
            video.save()
            
    return video
        