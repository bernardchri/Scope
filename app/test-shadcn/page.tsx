'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestShadcn() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Test shadcn/ui</h1>
      
      <div className="flex gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ma première Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Super propre avec shadcn !</p>
          <div className="flex gap-2 mt-2">
            <Badge>Badge 1</Badge>
            <Badge variant="secondary">Badge 2</Badge>
            <Badge variant="destructive">Badge 3</Badge>
            <Badge variant="outline">Badge 4</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}