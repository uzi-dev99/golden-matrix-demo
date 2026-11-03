import { POSTER_URL, VIDEO_URL } from '@/components/login/media';

/**
 * The media of the login hero, shared with the app screens (one component, not a copy): the poster
 * paints the frame and the video covers it while it plays. With reduced motion the browser skips
 * the source, so the mp4 is never downloaded.
 */
export function HeroMedia({ className }: { className?: string }) {
  return (
    <div
      className={className ? `hero__media ${className}` : 'hero__media'}
      style={{ backgroundImage: `url(${POSTER_URL})` }}
    >
      <video autoPlay muted loop playsInline preload="auto" poster={POSTER_URL} aria-hidden="true">
        {/* With reduced motion the browser skips this source: the mp4 is never downloaded. The
            query is negated: an engine that does not know the feature evaluates it as false, and
            the negation keeps the video there (the old gate left the hero with only the poster). */}
        <source src={VIDEO_URL} type="video/mp4" media="not (prefers-reduced-motion: reduce)" />
      </video>
    </div>
  );
}
