from django.urls import path
from .views import flashcards, generate_summary, get_csrf_token

urlpatterns = [
    path('api/summary/', generate_summary),
    path('api/get-csrf/', get_csrf_token),
    path('api/flashcards/', flashcards),

]
