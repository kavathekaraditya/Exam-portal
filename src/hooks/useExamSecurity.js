import { useState, useEffect, useCallback } from "react";

export function useExamSecurity(isActive, onViolationLimitExceeded) {
  const [warnings, setWarnings] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Check if document is currently in fullscreen mode
  const checkFullscreen = useCallback(() => {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }, []);

  // Request fullscreen mode
  const enterFullscreen = useCallback(async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error("Error attempting to enable full-screen mode:", err);
    }
  }, []);

  // Exit fullscreen mode
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error("Error attempting to exit full-screen mode:", err);
    }
  }, []);

  const handleViolation = useCallback((reason) => {
    if (!isActive) return;

    setWarnings((prev) => {
      const nextWarnings = prev + 1;
      setLastViolationReason(reason);
      setShowWarningModal(true);

      if (nextWarnings >= 4) {
        // Auto-submit flow
        onViolationLimitExceeded(reason);
      }
      return nextWarnings;
    });
  }, [isActive, onViolationLimitExceeded]);

  // Hook up event listeners for tab switching / focus loss
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab switched / Window minimized");
      }
    };

    const handleWindowBlur = () => {
      // Small timeout to prevent false positives (e.g. clicking scrollbar or browser UI)
      const timeoutId = setTimeout(() => {
        if (!document.hasFocus()) {
          handleViolation("Lost window focus");
        }
      }, 200);
      return timeoutId;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    // Initial check of fullscreen status
    setIsFullscreen(checkFullscreen());

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = checkFullscreen();
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && isActive) {
        handleViolation("Exited Fullscreen mode");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [isActive, handleViolation, checkFullscreen]);

  return {
    warnings,
    isFullscreen,
    lastViolationReason,
    showWarningModal,
    setShowWarningModal,
    enterFullscreen,
    exitFullscreen,
    setWarnings
  };
}
