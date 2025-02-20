import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Property {
  id: number;
  value: number;
  address: string;
  monthlyPayment: number;
  ltvRatio: number;
  status: string;
}

export default function UserProperties() {
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!properties?.length) {
    return (
      <Card className="w-full mt-8">
        <CardHeader>
          <CardTitle>Your Properties</CardTitle>
          <CardDescription>
            You haven't added any properties yet. Use the calculator above to evaluate your property.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle>Your Properties</CardTitle>
        <CardDescription>
          List of properties you have added for reverse mortgage evaluation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property Value</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Monthly Payment</TableHead>
              <TableHead>LTV Ratio</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id}>
                <TableCell>₹{property.value.toLocaleString()}</TableCell>
                <TableCell>{property.address}</TableCell>
                <TableCell>₹{property.monthlyPayment.toLocaleString()}</TableCell>
                <TableCell>{property.ltvRatio}%</TableCell>
                <TableCell className="capitalize">{property.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}