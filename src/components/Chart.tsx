/** Renders SVG produced by lib/charts (all dynamic text is escaped there). */
export function Chart({ svg, title }: { svg: string; title?: string }) {
  return (
    <figure className="chart">
      {title && <figcaption>{title}</figcaption>}
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </figure>
  );
}
