export default function Loading() {
  return (
    <section className="pageStack" aria-busy="true" aria-label="Memuat halaman">
      <div className="panel loadingSkeleton loadingSkeletonHeader" />
      <div className="statsGrid">
        {Array.from({ length: 4 }, (_, index) => <div className="metric loadingSkeleton" key={index} />)}
      </div>
      <div className="panel loadingSkeleton loadingSkeletonContent" />
    </section>
  );
}
