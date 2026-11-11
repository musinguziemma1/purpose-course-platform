import { redirect } from "next/navigation";

export default function MentorMenteesRedirect() {
  redirect("/mentor/learners");
}
