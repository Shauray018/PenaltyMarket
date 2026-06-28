export function GlobalLoader() {
  return (
    <div className="global-loader" role="status" aria-label="Loading">
      <div className="loader-wrap">
        <div className="loader-track">
          <div className="loader-fill" />
          <img className="loader-ball" src="/ball.png" alt="" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
