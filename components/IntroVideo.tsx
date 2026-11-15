"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { introVideo } from "@/lib/config";

/**
 * Autoplaying intro video. Browsers only allow autoplay when muted, so it starts
 * muted with a clear "tap for sound" control. It pauses when scrolled out of view
 * and does not autoplay for visitors who prefer reduced motion.
 */
export function IntroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const userPaused = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  // Autoplay only while visible (and only if motion is welcome).
  useEffect(() => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) userPaused.current = true;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) {
          video.play().catch(() => setPlaying(false));
        } else if (!entry.isIntersecting) {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
    } else {
      userPaused.current = true;
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted && video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
    }
  }

  function fullscreen() {
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
    else video.webkitEnterFullscreen?.(); // iOS Safari
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    video.currentTime = ((e.clientX - rect.left) / rect.width) * video.duration;
  }

  const btn =
    "flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/30";

  return (
    <figure className="mt-5">
      <div
        ref={wrapRef}
        className="group relative overflow-hidden rounded-2xl border bg-[#0a1636] shadow-[var(--shadow-soft)]"
        style={{ aspectRatio: introVideo.aspect }}
      >
        {failed ? (
          // eslint-disable-next-line @next/next/no-img-element -- static poster fallback
          <img src={introVideo.poster} alt={introVideo.title} className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full cursor-pointer object-cover"
            poster={introVideo.poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={introVideo.title}
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
          >
            {introVideo.sources.map((s, i) => (
              <source
                key={s.src}
                src={s.src}
                type={s.type}
                // When the last source fails too, fall back to the poster.
                onError={i === introVideo.sources.length - 1 ? () => setFailed(true) : undefined}
              />
            ))}
          </video>
        )}

        {!failed && (
          <>
            {/* Big play button when paused */}
            {!playing && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play video"
                className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-brand shadow-lg transition-transform duration-200 hover:scale-105"
              >
                <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden="true" />
              </button>
            )}

            {/* Sound hint */}
            {playing && muted && (
              <button
                type="button"
                onClick={toggleMute}
                className="absolute right-3 top-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/70"
              >
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                Tap for sound
              </button>
            )}

            {/* Control bar */}
            <div
              className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-3 pb-2.5 pt-6 transition-opacity duration-200 ${
                playing
                  ? "[@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                  : ""
              }`}
            >
              <div
                className="relative mb-2 h-1.5 cursor-pointer rounded-full bg-white/30"
                onClick={seek}
                role="presentation"
              >
                <div
                  className="bg-gradient-brand absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={togglePlay} aria-label={playing ? "Pause video" : "Play video"} className={btn}>
                  {playing ? (
                    <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true" />
                  )}
                </button>
                <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute video" : "Mute video"} className={btn}>
                  {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
                </button>
                <span className="ml-1 truncate text-xs font-semibold text-white/90">{introVideo.title}</span>
                <button type="button" onClick={fullscreen} aria-label="Full screen" className={`${btn} ml-auto`}>
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </figure>
  );
}
