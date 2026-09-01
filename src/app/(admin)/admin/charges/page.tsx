import { redirect } from "next/navigation";

import { adminPath } from "@/lib/routes";

export default function AdminChargesRedirectPage() {
  redirect(adminPath("charges/membership"));
}
