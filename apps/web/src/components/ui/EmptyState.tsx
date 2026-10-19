export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick?: () => void };
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? (
        <button type="button" className="primary" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
