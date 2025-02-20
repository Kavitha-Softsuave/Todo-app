import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Property } from "@shared/schema";
import { Home, Calendar, DollarSign, Building2, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PropertyCardProps {
  property: Property;
  isSeniorView: boolean;
}

export default function PropertyCard({ property, isSeniorView }: PropertyCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/properties"]);
      toast({
        title: "Success",
        description: "Property has been deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateMou = () => {
    // TODO: Implement MOU creation
    console.log("Create MOU for property:", property.id);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      deleteMutation.mutate();
    }
  };

  const canEdit = property.status === 'pending';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6" />
            <h3 className="text-xl font-semibold">{property.address}</h3>
          </div>
          {isSeniorView && canEdit && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => console.log("Edit property:", property.id)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg">
            Property Value: ${property.value.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg">Term: {property.term} years</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg">
            Monthly Payment: ${property.monthlyPayment.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg">Status: {property.status}</span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {isSeniorView ? (
          <Button variant="outline" className="w-full">
            View Details
          </Button>
        ) : (
          <>
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleCreateMou}
            >
              Create MOU
            </Button>
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}