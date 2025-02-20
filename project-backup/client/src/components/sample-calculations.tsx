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

const sampleCalculations = [
  {
    propertyValue: 15000000, // 1.5 Crore
    address: "Palm Grove Apartments, Malad West, Mumbai",
    monthlyPayout: 45000,
    ltvRatio: 60,
    appreciationRate: 3,
    totalLoanAmount: 9000000,
    tenure: 15,
  },
  {
    propertyValue: 8000000, // 80 Lakhs
    address: "Green Valley Colony, Banjara Hills, Hyderabad",
    monthlyPayout: 28000,
    ltvRatio: 65,
    appreciationRate: 4,
    totalLoanAmount: 5200000,
    tenure: 12,
  },
  {
    propertyValue: 12000000, // 1.2 Crore
    address: "Silver Oaks Estate, Whitefield, Bangalore",
    monthlyPayout: 38000,
    ltvRatio: 70,
    appreciationRate: 5,
    totalLoanAmount: 8400000,
    tenure: 18,
  },
  {
    propertyValue: 6500000, // 65 Lakhs
    address: "Riverside Gardens, Salt Lake City, Kolkata",
    monthlyPayout: 22000,
    ltvRatio: 60,
    appreciationRate: 3,
    totalLoanAmount: 3900000,
    tenure: 10,
  },
];

export default function SampleCalculations() {
  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle>Sample Reverse Mortgage Calculations</CardTitle>
        <CardDescription>
          Examples of reverse mortgage calculations across different property values and locations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property Value</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Monthly Payout</TableHead>
              <TableHead>LTV Ratio</TableHead>
              <TableHead>Appreciation</TableHead>
              <TableHead>Total Loan</TableHead>
              <TableHead>Tenure (Years)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleCalculations.map((calc, index) => (
              <TableRow key={index}>
                <TableCell>₹{calc.propertyValue.toLocaleString()}</TableCell>
                <TableCell>{calc.address}</TableCell>
                <TableCell>₹{calc.monthlyPayout.toLocaleString()}</TableCell>
                <TableCell>{calc.ltvRatio}%</TableCell>
                <TableCell>{calc.appreciationRate}%</TableCell>
                <TableCell>₹{calc.totalLoanAmount.toLocaleString()}</TableCell>
                <TableCell>{calc.tenure}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
