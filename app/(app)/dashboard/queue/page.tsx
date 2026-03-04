import { requirePageRole } from "@/lib/authz";
import QueueClient from "./QueueClient";

export default async function QueuePage() {
  // Assessor role only
  await requirePageRole(["assessor"]);

  return <QueueClient />;
}
