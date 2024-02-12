import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuthSession } from "@/lib/auth";
import { User2 } from "lucide-react";
import Link from "next/link";
import DropdownMenuItemLogout from "./DropdownMenuItemLogout";

export const UserProfile = async () => {
  const session = await getAuthSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>{session?.user.name ?? ""}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
        <Link href="/profile" >
            <User2 className="mr-2 h-4 w-4"/>
            Profile
        </Link>
        </DropdownMenuItem>
        <DropdownMenuItemLogout/>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
