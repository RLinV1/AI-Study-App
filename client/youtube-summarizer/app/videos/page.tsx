"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const Videos = () => {
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [csrftoken, setCsrfToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    const fetchCsrfToken = async () => {
      await axios
        .get("http://localhost:8000/api/get-csrf/", {
          withCredentials: true, // Axios equivalent to credentials: 'include'
        })
        .then((response) => {
          console.log("CSRF GET request response:", response);
        })
        .catch((error) => {
          console.error("CSRF GET request error:", error);
        });

      console.log("CSRF GET request succeeded");

      // Now read CSRF token from cookies:
      setCsrfToken(getCookie("csrftoken"));
      console.log("CSRF token set:", getCookie("csrftoken"));
    };
    fetchCsrfToken();
    fetchVideos();
  }, []);
  const fetchVideos = async () => {
    // if (!csrftoken) {
    //   console.error("CSRF token not found. Ensure it is set correctly.");
    //   return;
    // }
    console.log("fetchVideos called");

    try {
      const response = await axios.get("http://localhost:8000/api/videos/");
      const data = response.data;
      console.log(data);
      setVideos(data.videos);
    } catch (error) {
      if (error instanceof Error){
        setError(error.message)
      } else {
        setError("Unknown error occured")
      }
    }
  };
  interface VideoEntry {
    video_id: string;
    title: string;
    summary_text: string;
    quiz_text: string;
    created_at: string;
  }
  return (
    <div className="min-h-screen w-full flex flex-col items-center  bg-gray-900">
      <nav className="w-full bg-gray-800 p-4 ">
        <ul className="flex justify-around">
          <li>
            <a href="/" className="hover:underline">
              Youtube Summarizer
            </a>
          </li>
          <li>
            <a href="/quiz" className="hover:underline">
              Youtube Quiz Generator
            </a>
          </li>
          <li>
            <a href="/videos" className="hover:underline">
              Other Video Summaries & Quizzes
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex flex-col items-center mt-16">
        <h1 className="text-5xl font-bold text-white mb-4">
          Other Users Generated YouTube Summaries & Quizzes
        </h1>
        <div className="text-2xl mb-4">
          Explore how others are using the app
        </div>
      </div>
      {error && <div className="text-xl text-red-500">{error}</div>}
      {videos &&
        videos.map(
          ({ video_id, title, summary_text, quiz_text, created_at }, index) => (
            <div
              key={index}
              className="flex flex-col items-center mt-8 mb-8 p-4 h-fit max-w-3/4 bg-gray-800 text-white overflow-auto rounded-lg"
            >
              {title || "Untitled"} | {new Date(created_at).toLocaleDateString()}
              <div
                className={`flex p-4 w-full h-[75vh]`}
              >
                <div className={`${quiz_text && summary_text ? "w-[40%]" : "w-1/2"} h-full aspect-video flex flex-col gap-8`}>
                  <iframe
                    src={`https://www.youtube.com/embed/${video_id}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className={`${
                      quiz_text && summary_text
                        ? "w-full h-1/2 rounded-xl"
                        : "w-full h-full rounded-xl"
                    }`}
                  />
                  {quiz_text && summary_text && (
                    <div className=" h-1/2  flex flex-col w-full overflow-y-scroll overflow-x-hidden ">
                      {quiz_text.split("\n").map((line, index) => (
                        <div key={index} className="mb-2">
                          <ReactMarkdown key={index}>{line}</ReactMarkdown>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={`${
                    quiz_text && !summary_text ? "mb-12" : "mb-4"
                  }  px-8 h-full flex flex-col w-full overflow-y-scroll overflow-x-hidden `}
                >
                  {summary_text?.split("\n").map((line, index) => (
                    <div key={index} className="mb-2">
                      <ReactMarkdown key={index}>{line}</ReactMarkdown>
                    </div>
                  ))}
                  {quiz_text && !summary_text && (
                    <div>
                      {quiz_text.split("\n").map((line, index) => (
                        <div key={index} className="mb-2">
                          <ReactMarkdown key={index}>{line}</ReactMarkdown>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
    </div>
  );
};
function getCookie(name: string): string | undefined {
  if (!document.cookie) return undefined;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value);
  }
  return undefined;
}
export default Videos;
