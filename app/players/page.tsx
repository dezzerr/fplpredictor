import { redirect } from "next/navigation";

export default function PlayersPage() {
  // Redirect to compare page - players page is deprecated
  redirect("/compare");
}
