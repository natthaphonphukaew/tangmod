import { TangmodApp } from "@/components/app/TangmodApp";
import { getAuthOptions } from "@/lib/auth-options";

export default function Home() {
  return <TangmodApp authOptions={getAuthOptions()} />;
}
