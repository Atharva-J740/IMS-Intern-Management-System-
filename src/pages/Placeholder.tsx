import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Construction className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>
            This module is currently under construction and will be available in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We are working hard to bring you the best experience. Check back soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
