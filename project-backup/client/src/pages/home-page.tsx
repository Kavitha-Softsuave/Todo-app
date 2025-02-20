import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import PropertyCard from "@/components/property-card";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Plus, Calculator } from "lucide-react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Reverse Mortgage Marketplace</h1>
          <div className="flex items-center gap-4">
            <span className="text-lg">
              Welcome, {user?.fullName} ({user?.userType})
            </span>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {user?.userType === "senior" ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Your Properties</h2>
              <Link href="/calculator">
                <Button size="lg" className="text-lg">
                  <Calculator className="mr-2 h-5 w-5" />
                  New Reverse Mortgage
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties?.map((property) => (
                <PropertyCard 
                  key={property.id} 
                  property={property} 
                  isSeniorView={true}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Available Properties</h2>
              <div className="flex gap-4">
                <Button variant="outline" size="lg" className="text-lg">
                  Filter Properties
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties?.map((property) => (
                <PropertyCard 
                  key={property.id} 
                  property={property}
                  isSeniorView={false}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}