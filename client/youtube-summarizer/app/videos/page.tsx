"use client";
import axios from "axios";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { SyncLoader } from "react-spinners";

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
    const fetchData = async () => {
      await fetchCsrfToken();
      await fetchVideos();
    };
    fetchData();
  }, []);
  const fetchVideos = async () => {
    if (!csrftoken) {
      console.error("CSRF token not found. Ensure it is set correctly.");
      return;
    }
    console.log("fetchVideos called");

    try {
      const response = await axios.get("http://localhost:8000/api/videos/");
      const data = response.data;
      console.log(data);
      const videos = data.videos.map((video: VideoEntry) => ({
        ...video,
        clicked: false,
      }));
      setVideos(videos);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unknown error occured");
      }
    }
  };

  const downloadTranscript = (transcript: string, title: string) => {
    const transcriptObj = JSON.parse(transcript);
    const transcriptStr = JSON.stringify(transcriptObj, null, 2);
    const blob = new Blob([transcriptStr], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = title + "-transcript.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  interface VideoEntry {
    video_id: string;
    title: string;
    summary_text: string;
    quiz_text: string;
    transcript: string;
    created_at: string;
    clicked: boolean;
  }
  const toggleClicked = (video_id: string) => {
    setVideos(
      videos.map((v) =>
        v.video_id === video_id ? { ...v, clicked: !v.clicked } : v
      )
    );
  };
  return (
    <div className="min-h-screen w-full flex flex-col items-center  bg-gray-900">
      <nav className="w-full bg-gray-800 p-4 ">
        <ul className="flex justify-around">
          <li>
            <Link href="/" className="hover:underline">
              Youtube Summarizer
            </Link>
          </li>
          <li>
            <Link href="/quiz" className="hover:underline">
              Youtube Quiz Generator
            </Link>
          </li>
          <li>
            <Link href="/videos" className="hover:underline">
              Other Video Summaries & Quizzes
            </Link>
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
      {videos.length == 0 && (
        <div>
          <SyncLoader size={50} color="white" margin={15} />{" "}
        </div>
      )}
      {videos &&
        videos.map(
          (
            {
              video_id,
              title,
              summary_text,
              quiz_text,
              created_at,
              transcript,
              clicked,
            },
            index
          ) => (
            <div
              key={index}
              className={`${
                clicked
                  ? "flex flex-col items-center mt-8 mb-8 p-4 h-fit max-w-3/4 bg-gray-800 text-white overflow-auto rounded-lg"
                  : "py-4 px-8 bg-gray-800 my-8  flex flex-col items-center max-w-3/4 rounded-lg"
              }`}
            >
              {clicked && (
                <div className="text-white text-lg font-semibold">
                  {title || "Untitled"} |{" "}
                  {new Date(created_at).toLocaleDateString()}
                </div>
              )}
              {!clicked && (
                <div className="w-full flex justify-center flex-col items-center gap-4 min-w-xl max-w-3xl h-[50vh] ">
                  <div className="text-white text-lg font-semibold">
                    {title || "Untitled"} |{" "}
                    {new Date(created_at).toLocaleDateString()}
                  </div>
                  <div className="w-full h-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${video_id}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full rounded-xl"
                    />
                  </div>
                  <div
                    onClick={() => toggleClicked(video_id)}
                    className="bg-gray-500 cursor-pointer p-2 rounded-lg"
                  >
                    Show more
                  </div>
                </div>
              )}
              <div
                className={` transition-all duration-500 ease-in-out overflow-hidden  ${
                  clicked
                    ? "flex p-4 w-full  h-[75vh] opacity-100 scale-100"
                    : "opacity-0 scale-95 h-0 p-0 w-0 "
                }`}
              >
                <div
                  className={`${
                    quiz_text && summary_text ? "w-[40%]" : "w-1/2"
                  } h-full aspect-video flex flex-col gap-8`}
                >
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
              <div className="flex justify-center items-center gap-8">
                {transcript && clicked && (
                  <div
                    onClick={() => {
                      downloadTranscript(transcript, title);
                    }}
                    className="cursor-pointer bg-gray-500 rounded-lg p-2 mt-2"
                  >
                    Download transcript
                  </div>
                )}
                {clicked && (
                  <div
                    onClick={() => toggleClicked(video_id)}
                    className="cursor-pointer bg-gray-500 rounded-lg p-2 mt-2"
                  >
                    Show Less
                  </div>
                )}
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
