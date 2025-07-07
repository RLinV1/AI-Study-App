from django.urls import path
from .views import quiz, generate_summary, get_csrf_token, get_videos

urlpatterns = [
    path('api/summary/', generate_summary),
    path('api/get-csrf/', get_csrf_token),
    path('api/quiz/', quiz),
    path('api/videos/', get_videos)
]
