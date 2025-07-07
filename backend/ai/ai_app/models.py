from django.db import models

# Create your models here.
class Video(models.Model):
    video_id = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255, blank=True, default="")
    summary_text = models.TextField(blank=True, null=True)  
    quiz_text = models.TextField(blank=True, null=True)    
    transcript = models.TextField(blank=True, null=True) 
    created_at = models.DateTimeField(auto_now_add=True)
