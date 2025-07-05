import json
from django.http import JsonResponse
from django.shortcuts import render

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

def flashcards(request):
    if request.method != "POST":
        return JsonResponse({"data": "Invalid request method. Please use POST."})

    print("Generating flashcards...")

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"data": "Invalid JSON."})
    
    
    url = body.get("url", "").strip()
    print(url)
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

    # Prepare conversation for flashcards
    conversation_flashcards = [
        {
            "role": "system",
            "content": (
                "You are an expert at transforming video transcripts into educational flashcards. "
                "From the provided transcript, extract important concepts, facts, or explanations and turn them into clear, concise Q&A flashcards. "
                "Each flashcard MUST begin with 'Question:' (not 'Q:') and be followed by 'Answer:' (not 'A:'). "
                "Do NOT abbreviate these labels. Stick to this exact format for every flashcard."
                "Focus on creating meaningful, informative flashcards that cover key points, definitions, explanations, and examples from the content. "
                "Avoid generating summaries or outlines—only flashcards in Q&A form."
            ),
        },
        {"role": "user", "content": input_text},
    ]

    processed_flashcards = generate_ai_response(conversation_flashcards)

    return JsonResponse({"data": processed_flashcards})

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
                "Identify all major topics, subtopics, and key explanations or demonstrations presented in the video.\n"
                "Organize the content into a numbered outline, using proper hierarchy (main points, subpoints, and nested explanations).\n"
                "For each point, write a **short heading** followed by a **concise but informative paragraph** that explains what was discussed.\n"
                "Use full sentences and avoid vague or generic summaries — every point should contain meaningful information from the video.\n"
                "Do not generate lists of keywords, simple bullet points, or summaries that only describe the structure of the video. Your summary should reflect the **substance** of the content.\n"
                "Focus only on what is taught or explained in the video — exclude filler like greetings, self-promotion, or off-topic comments.\n"
                "Aim to be accurate, educational, and complete — imagine the reader did not watch the video but needs to understand everything important from it.\n\n"
                "Output Format:\n"
                "- A hierarchical summary with clear numbered structure.\n"
                "- Each section should be rich in educational content, not just titles."
            ),
        },
        {"role": "user", "content": input_text},
    ]

    processed_summary = generate_ai_response(conversation_summary)
    return JsonResponse({"data": processed_summary})

