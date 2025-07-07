"use client"; // for Next.js App Router — if using Pages Router, this isn't needed

import { CSSProperties, useEffect, useState } from "react";
import axios from "axios";
import { BarLoader, PacmanLoader } from "react-spinners";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const getEmbedUrl = (youtubeUrl: string) => {
    const url = new URL(youtubeUrl);
    const videoId = url.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  };

  const [summary, setSummary] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const [csrftoken, setCsrfToken] = useState<string | undefined>(undefined);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setIsLoading] = useState(false);
  const override: CSSProperties = {
    display: "block",
    margin: "0 auto",
    width: "100%",
  };
  interface TranscriptEntry {
    duration: number;
    start: number;
    text: string;
  }

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
  }, []);
  const fetchSummary = async () => {
    if (!csrftoken) {
      console.error("CSRF token not found. Ensure it is set correctly.");
      return;
    }
    console.log("fetchSummary called");
    setError("");
    try {
      setIsLoading(true);

      const response = await axios.post(
        "http://localhost:8000/api/summary/",
        { url: youtubeUrl },
        {
          headers: {
            "X-CSRFToken": csrftoken,
            "Content-Type": "application/json",
          },
          withCredentials: true, // Required to send the cookie
        }
      );

      const data = await response.data;

      console.log(data);
      setSummary(data.summary);
      setTranscript(data.transcript);

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unknown error occured");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSummary(""); // Clear previous summary
    fetchSummary();
  };

  return (
    <div className="flex flex-col items-center min-h-screen  bg-gray-900 text-white overflow-auto ">
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

      <div className="flex flex-col items-center  h-full mt-16 p-8 ">
        <form
          className="flex flex-col justify-center items-center gap-2"
          onSubmit={handleSubmit}
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            YouTube Video Summarizer
          </h1>
          <div className="text-2xl mb-4">
            Get YouTube transcript and use AI to summarize YouTube videos in one
            click for free.
          </div>
          <input
            type="text"
            placeholder="Enter YouTube URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full py-2 px-2 mb-4 border border-gray-300 rounded bg-white text-gray-900 min-w-2xl"
            required
          />
          {!error && (
            <>
              <BarLoader
                color={"#3B82F6"}
                loading={loading}
                cssOverride={override}
                aria-label="Loading Bar"
                data-testid="loader"
              />
              {loading && <div>Waiting for AI to generate a summary...</div>}
              <PacmanLoader color={"white"} loading={loading} />
            </>
          )}

          {error && <div className="text-xl text-red-500">{error}</div>}
          {!loading && (
            <button
              type="submit"
              className=" bg-blue-500 text-white p-2 rounded cursor-pointer w-full"
            >
              Generate Summary
            </button>
          )}
        </form>
        {summary && (
          <div className="flex mt-12 gap-8 min-w-[90vw] bg-gray-800 p-8 rounded-lg">
            <div className="flex flex-col w-[40%] max-h-screen gap-8">
              {youtubeUrl && (
                <iframe
                  src={getEmbedUrl(youtubeUrl)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full rounded-xl"
                />
              )}
              {transcript && (
                <div className="p-6  flex flex-col max-h-[50%] overflow-y-scroll">
                  <div className="text-2xl mb-4">Transcript: </div>
                  {transcript.map(({ duration, start, text }, index) => (
                    <div key={index} className="mb-4">
                      {Math.round(start * 100) / 100}s -{" "}
                      {Math.round((start + duration) * 100) / 100}s
                      <br />
                      {text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6  flex flex-col w-[60%] overflow-y-scroll overflow-x-hidden max-h-screen">
              <div className="text-2xl mb-4">Summary: </div>
              {summary.split("\n").map((line, index) => (
                <div key={index} className="mb-2">
                  <ReactMarkdown key={index}>{line}</ReactMarkdown>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function getCookie(name: string): string | undefined {
  if (!document.cookie) return undefined;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value);
  }
  return undefined;
}
