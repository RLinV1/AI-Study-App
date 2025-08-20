"use client";
import axios from "axios";
import React, { CSSProperties, useEffect, useState } from "react";
import { BarLoader, PacmanLoader } from "react-spinners";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

const Quiz = () => {
  const [quiz, setQuiz] = useState("");
  const [csrftoken, setCsrfToken] = useState<string | undefined>(undefined);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setIsLoading] = useState(false);
  const override: CSSProperties = {
    display: "block",
    margin: "0 auto",
    width: "100%",
  };
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

  const fetchQuiz = async () => {
    if (!csrftoken) {
      console.error("CSRF token not found. Ensure it is set correctly.");
      return;
    }
    console.log("fetchQuiz called");

    setError("");
    try {
      setIsLoading(true);
      const response = await axios.post(
        "http://localhost:8000/api/quiz/",
        {
          url: youtubeUrl,
        },
        {
          headers: {
            "X-CSRFToken": csrftoken,
            "Content-Type": "application/json",
          },
          withCredentials: true, // This is important to include cookies in the request
        }
      );
      const data = response.data;
      console.log(data);
      setQuiz(data.quiz);
      setIsLoading(false);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unknown error");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuiz(""); // Clear previous summary
    fetchQuiz();
  };

  return (
    <div className="flex flex-col items-center min-h-screen  bg-gray-900 text-white overflow-auto ">
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

      <div className="flex flex-col items-center  h-full mt-16 p-8 ">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col justify-center items-center gap-2"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            YouTube Quiz Generator
          </h1>
          <div className="text-2xl mb-4">
            Use AI to generate custom quiz for YouTube videos in one click
            for free.
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
              {loading && <div>Waiting for AI to generate quiz...</div>}
              <PacmanLoader color={"white"} loading={loading} />
            </>
          )}

          {error && <div className="text-xl text-red-500 mb-4">{error}</div>}
          {!loading && (
            <button
              type="submit"
              className=" bg-blue-500 text-white p-2 rounded cursor-pointer w-full"
            >
              Generate Quiz
            </button>
          )}
        </form>
        {quiz && (
          <div className="p-6 m-8 bg-gray-800 flex flex-col w-full overflow-y-scroll max-h-[80vh] rounded-lg">
            <div className="text-2xl mb-4">Quiz: </div>
            {quiz.split("\n").map((line, index) => (
              <div className="mb-2" key={index}>
                <ReactMarkdown key={index}>{line}</ReactMarkdown>
              </div>
            ))}
          </div>
        )}
      </div>
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
export default Quiz;
