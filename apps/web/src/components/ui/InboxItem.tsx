export function InboxItem({
  tone = 'neutral',
  title,
  body,
  arriving,
  actions,
}: {
  tone?: 'neutral' | 'warn';
  title: string;
  body?: string;
  arriving?: boolean;
  actions?: { label: string; onClick?: () => void }[];
}) {
  return (
    <article className={tone === 'warn' ? 'inbox warn' : 'inbox'}>
      <div className={arriving ? 'arriving' : undefined}>
        {arriving ? <span aria-hidden="true">◌</span> : null}
        <h3>{title}</h3>
      </div>
      {body ? <p>{body}</p> : null}
      {actions && actions.length > 0 ? (
        <div className="actions">
          {actions.map((a) => (
            <button key={a.label} type="button" className="ghost" onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
