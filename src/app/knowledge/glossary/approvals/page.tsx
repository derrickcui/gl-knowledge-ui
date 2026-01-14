export default function ApprovalsPage() {
  return (
    <div>
      <div className="text-lg font-semibold">Approvals</div>
      <p className="mt-2 text-sm opacity-70">
        Terms under review that require your decision.
        This tab is user-centric and only includes lifecycle
        status IN_REVIEW assigned to the current reviewer.
      </p>
    </div>
  );
}
