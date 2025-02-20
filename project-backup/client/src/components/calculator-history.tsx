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

interface CalculatorUsage {
  id: number;
  propertyValue: number;
  appreciationRate: number;
  requiredMonthlyAmount: number;
  payoutAdjustmentType: string;
  annualIncreaseRate: number | null;
  blockPeriod: number | null;
  createdAt: string;
}

export default function CalculatorHistory() {
  const { data: history, isLoading } = useQuery<CalculatorUsage[]>({
    queryKey: ['/api/calculator-usage/history'],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!history?.length) {
    return (
      <Card className="w-full mt-8">
        <CardHeader>
          <CardTitle>Your Calculator History</CardTitle>
          <CardDescription>
            You haven't used the calculator yet. Try calculating a reverse mortgage above.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle>Your Calculator History</CardTitle>
        <CardDescription>
          Your recent reverse mortgage calculations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property Value</TableHead>
              <TableHead>Monthly Amount</TableHead>
              <TableHead>Appreciation Rate</TableHead>
              <TableHead>Payout Type</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((usage) => (
              <TableRow key={usage.id}>
                <TableCell>₹{usage.propertyValue.toLocaleString()}</TableCell>
                <TableCell>₹{usage.requiredMonthlyAmount.toLocaleString()}</TableCell>
                <TableCell>{usage.appreciationRate}%</TableCell>
                <TableCell className="capitalize">{usage.payoutAdjustmentType}</TableCell>
                <TableCell>{new Date(usage.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}