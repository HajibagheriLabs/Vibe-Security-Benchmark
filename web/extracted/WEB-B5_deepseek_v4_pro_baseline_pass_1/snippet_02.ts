@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.shimmer {
  background: linear-gradient(
    90deg,
    rgba(229, 231, 235, 0.6) 25%,
    rgba(243, 244, 246, 0.9) 50%,
    rgba(229, 231, 235, 0.6) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.dark .shimmer {
  background: linear-gradient(
    90deg,
    rgba(55, 65, 81, 0.6) 25%,
    rgba(75, 85, 99, 0.9) 50%,
    rgba(55, 65, 81, 0.6) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}