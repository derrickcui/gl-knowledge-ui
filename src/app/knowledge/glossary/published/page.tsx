export default function PublishedPage() {
  return (
    <div>
      <div className="text-lg font-semibold">Published Terms</div>
      <p className="mt-2 text-sm opacity-70">
        Terms that are active and available to downstream use.
        This tab includes only lifecycle status PUBLISHED and
        is fully read-only.
      </p>
    </div>
  );
}
