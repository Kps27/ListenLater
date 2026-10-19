export function SentenceHighlighter({
  sentences,
  paragraphs,
  index,
  onJump,
}: {
  sentences: string[];
  paragraphs?: string[][];
  index: number;
  onJump?: (i: number) => void;
}) {
  const groups = paragraphs?.some((group) => group.length) ? paragraphs : [sentences];

  let cursor = 0;
  return (
    <div className="prose">
      {groups.map((group, gi) => (
        <p key={gi}>
          {group.map((sentence) => {
            const i = cursor++;
            return (
              <span key={i}>
                <span
                  className={i === index ? 's on' : 's'}
                  role="button"
                  tabIndex={0}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => onJump?.(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onJump?.(i);
                    }
                  }}
                >
                  {sentence}
                </span>{' '}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
