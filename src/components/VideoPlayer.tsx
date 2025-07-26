import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  videoPath: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

export function VideoPlayer({ videoPath, currentTime, onTimeUpdate, onDurationChange }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      onDurationChange(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [onTimeUpdate, onDurationChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || Math.abs(video.currentTime - currentTime) < 0.1) return;
    
    video.currentTime = currentTime;
  }, [currentTime]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      flex: 1,
      minHeight: 400,
      backgroundColor: '#000',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      <video
        ref={videoRef}
        src={videoPath}
        controls
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '70vh',
          cursor: 'pointer'
        }}
        onClick={handleVideoClick}
        onError={(e) => {
          console.error('Video error:', e);
        }}
      />
    </div>
  );
}
