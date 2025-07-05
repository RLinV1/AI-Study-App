from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from youtube_transcript_api import YouTubeTranscriptApi
import torch
import json
import re

# Fetch transcript
url = input("Enter YouTube video link: ").strip()

pattern = r"(?:v=|\/)([0-9A-Za-z_-]{11})"
match = re.search(pattern, url)
if not match:
    print("Invalid YouTube video ID format.")
    exit(1)

video_id = match.group(1)

transcript = YouTubeTranscriptApi().fetch(video_id)

input_text = " ".join([entry.text for entry in transcript])

print("Transcript fetched successfully.")
with open("transcript.txt", "w", encoding="utf-8") as f:
    json.dump(transcript.to_raw_data(), f, indent=2)

with open("text_data.txt", "w") as f:
    f.write(input_text)
    
#Check device
device = "cuda" if torch.cuda.is_available() else "cpu"
print("Using device:", device)
    
# Load Llama 3.2B Instruct model
model_name = "meta-llama/Llama-3.2-1B-Instruct"  # Replace with a valid model checkpoint if needed
tokenizer = AutoTokenizer.from_pretrained(model_name, use_safetensors=True)
tokenizer.pad_token_id = tokenizer.eos_token_id
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16 if device == "cuda" else torch.float32,
    use_safetensors=True,
    device_map=device,
)



conversation = [
    {
        "role": "system",
        "content": (
            "You are an expert at summarizing video content from transcripts. "
            "Create a clear, detailed, hierarchical summary that captures all main points, sub-points, "
            "and important details or explanations from the video content. "
            "Present the summary as a well-structured outline with numbered or indented points. "
            "For each point and sub-point, include a brief but informative summary paragraph explaining the content, "
            "not just a heading or bullet point. "
            "Avoid unnecessary filler or general instructions. "
            "Focus solely on the video’s content, ensuring the summary is accurate, concise, and easy to follow."
        ),
    },
    {"role": "user", "content": input_text.strip()},
]


prompt = tokenizer.apply_chat_template(conversation, tokenize=False)
inputs = tokenizer(prompt, return_tensors="pt").to(device)


with torch.no_grad():
    output = model.generate(
        **inputs,
        do_sample=True,
        max_new_tokens=1000
    )

processed_text = tokenizer.decode(output[0][len(inputs.input_ids[0]):], skip_special_tokens=True)


processed_text = processed_text.lstrip("assistant:").strip()

print("Text processed successfully.")

with open("summary.txt", "w") as f:
    f.write(processed_text)


conversation_flashcards = [
    {
        "role": "system",
        "content": (
            "You are an expert at transforming video transcripts into educational flashcards. "
            "From the provided transcript, extract important concepts, facts, or explanations and turn them into clear, concise Q&A flashcards. "
            "Each flashcard should have a 'Question:' followed by an 'Answer:' format. "
            "Focus on creating meaningful, informative flashcards that cover key points, definitions, explanations, and examples from the content. "
            "Avoid generating summaries or outlines—only flashcards in Q&A form."
        ),
    },
    {"role": "user", "content": input_text.strip()},
]
# Generate Flashcards
prompt_flashcards = tokenizer.apply_chat_template(conversation_flashcards, tokenize=False)
inputs_flashcards = tokenizer(prompt_flashcards, return_tensors="pt").to(device)

with torch.no_grad():
    output_flashcards = model.generate(
        **inputs_flashcards,
        do_sample=True,
        max_new_tokens=1500
    )

processed_flashcards = tokenizer.decode(
    output_flashcards[0][len(inputs_flashcards.input_ids[0]):], 
    skip_special_tokens=True
)

processed_flashcards = processed_flashcards.lstrip("assistant:").strip()

with open("flashcards.txt", "w") as f:
    f.write(processed_flashcards)

print("Flashcards generated successfully.")