import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function PlaceholderPage({
  title,
  description,
  actionLabel = "Back to Dashboard",
  actionHref = "/dashboard",
}: PlaceholderPageProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
            <p className="text-neutral-600">{description}</p>
            <div className="pt-2">
              <Button onClick={() => setLocation(actionHref)}>{actionLabel}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
