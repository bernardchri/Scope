import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthSession } from "@/lib/auth";

export default async function Home() {
  const session = await getAuthSession();


  return (
    <div className="">
      <p>{JSON.stringify(session)}</p>
      <Button variant={"destructive"}>click</Button>
       <Input/>
    </div>
  );
}
