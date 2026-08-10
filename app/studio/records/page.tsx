import { StudioShell, StudioHeading } from "../../components/studio-shell";
import StudioRecords from "../../components/studio-records";

export default function StudioRecordsPage() {
  return (
    <StudioShell active="records">
      <StudioHeading
        kicker="ARCHIVE · 经历与成果"
        title="经历与成果"
        intro="把校园、项目、竞赛与思考写成可验证的记录；公开权限由你决定。"
      />
      <StudioRecords />
    </StudioShell>
  );
}
