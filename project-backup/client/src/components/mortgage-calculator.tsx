import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Info, Calculator } from "lucide-react";
import { Loader2 } from "lucide-react";

const calculatorFormSchema = z.object({
  propertyValue: z.string().min(1, "Property value is required"),
  appreciationRate: z.string().min(1, "Property appreciation rate is required"),
  requiredMonthlyAmount: z.string().min(1, "Required monthly amount is required"),
  payoutAdjustmentType: z.enum(["annual", "block"]),
  annualIncreaseRate: z.string().optional(),
  blockPeriod: z.string().optional(),
  blockIncreaseRate: z.string().optional(),
  address: z.string().min(1, "Property address is required"),
  ltvRatio: z.string().min(1, "Loan to Value ratio is required"),
  interestRate: z.string()
    .min(1, "Interest rate is required")
    .refine(val => {
      const rate = parseFloat(val);
      return rate >= 8 && rate <= 15;
    }, "Interest rate must be between 8% and 15%"),
  tenureType: z.enum(["maxLTV", "fixed"]),
  fixedTenureMonths: z.string().optional(),
});

type CalculatorFormData = z.infer<typeof calculatorFormSchema>;

type CalculationResult = {
  totalLoanAmount: number;
  interestRate: number;
  monthsPossible: number;
  maxLoanAmount: number;
  totalDisbursed: number;
  totalInterest: number;
  totalAppreciation: number;
  finalPropertyValue: number;
  yearlyPayouts: {
    year: number;
    monthlyAmount: number;
    totalDisbursed: number;
    interestAccrued: number;
    propertyValue: number;
    propertyAppreciation: number;
    ltvPercentage: number;
    monthsInYear?: number;
  }[];
};

export default function MortgageCalculator() {
  const [_, setLocation] = useLocation();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showBankSelection, setShowBankSelection] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<CalculatorFormData>({
    resolver: zodResolver(calculatorFormSchema),
    defaultValues: {
      propertyValue: "",
      appreciationRate: "3",
      requiredMonthlyAmount: "",
      payoutAdjustmentType: "annual",
      annualIncreaseRate: "0",
      blockPeriod: "5",
      blockIncreaseRate: "5",
      address: "",
      ltvRatio: "60",
      interestRate: "9.5",
      tenureType: "maxLTV",
      fixedTenureMonths: "",
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: CalculatorFormData) => {
      const baseInterestRate = parseFloat(data.interestRate) / 100;
      const propertyValue = parseFloat(data.propertyValue.replace(/,/g, ''));
      const appreciationRate = parseFloat(data.appreciationRate) / 100;
      const requiredMonthlyAmount = parseFloat(data.requiredMonthlyAmount.replace(/,/g, ''));
      const ltvRatio = parseFloat(data.ltvRatio) / 100;
      let currentPropertyValue = propertyValue;
      let maxLoanAmount = currentPropertyValue * ltvRatio;
      let totalAppreciation = 0;

      let monthsPossible = 0;
      let totalLoanAmount = 0;
      let totalDisbursed = 0;
      let totalInterest = 0;
      let yearlyPayouts: {
        year: number;
        monthlyAmount: number;
        totalDisbursed: number;
        interestAccrued: number;
        propertyValue: number;
        propertyAppreciation: number;
        ltvPercentage: number;
        monthsInYear?: number;
      }[] = [];
      let currentMonthlyAmount = requiredMonthlyAmount;
      let cumulativeLoanBalance = 0;

      const maxMonths = data.tenureType === "fixed" && data.fixedTenureMonths
        ? parseInt(data.fixedTenureMonths)
        : 240;

      if (data.payoutAdjustmentType === "annual" && data.annualIncreaseRate) {
        const annualIncrease = parseFloat(data.annualIncreaseRate) / 100;
        let currentLoanValue = 0;
        let year = 1;
        let remainingMonths = maxMonths;
        const targetLtvRatio = ltvRatio;

        while (currentLoanValue < maxLoanAmount && remainingMonths > 0) {
          let monthsThisYear = Math.min(12, remainingMonths);
          let monthlyAmount = currentMonthlyAmount;
          let yearlyDisbursement = monthlyAmount * monthsThisYear;

          // Check if adding this year's disbursement would exceed the LTV
          if (cumulativeLoanBalance + yearlyDisbursement > maxLoanAmount) {
            // Calculate how many months we can disburse before hitting LTV limit
            monthsThisYear = Math.floor((maxLoanAmount - cumulativeLoanBalance) / monthlyAmount);
            yearlyDisbursement = monthlyAmount * monthsThisYear;

            if (monthsThisYear <= 0) {
              break;
            }
          }

          const startingBalance = cumulativeLoanBalance;
          cumulativeLoanBalance += yearlyDisbursement;

          const averageBalance = (startingBalance + cumulativeLoanBalance) / 2;
          const yearlyInterest = (averageBalance * baseInterestRate) * (monthsThisYear / 12);

          // Check if adding interest would exceed LTV
          if (cumulativeLoanBalance + yearlyInterest > maxLoanAmount) {
            // Adjust interest to stay within LTV
            const remainingRoom = maxLoanAmount - cumulativeLoanBalance;
            cumulativeLoanBalance += remainingRoom;
            totalInterest += remainingRoom;
            break;
          }

          cumulativeLoanBalance += yearlyInterest;
          totalDisbursed += yearlyDisbursement;
          totalInterest += yearlyInterest;

          const propertyAppreciation = currentPropertyValue * appreciationRate;
          totalAppreciation += propertyAppreciation;

          yearlyPayouts.push({
            year,
            monthlyAmount: monthlyAmount,
            totalDisbursed: yearlyDisbursement,
            interestAccrued: yearlyInterest,
            propertyValue: currentPropertyValue,
            propertyAppreciation: propertyAppreciation,
            ltvPercentage: (cumulativeLoanBalance / currentPropertyValue) * 100,
            monthsInYear: monthsThisYear
          });

          currentLoanValue = cumulativeLoanBalance;

          // Calculate current LTV percentage
          const currentLtvPercentage = (currentLoanValue / currentPropertyValue) * 100;

          // Break if we're within 1.5% of target LTV
          if (Math.abs(currentLtvPercentage - (targetLtvRatio * 100)) <= 1.5) {
            break;
          }

          currentPropertyValue *= (1 + appreciationRate);
          maxLoanAmount = currentPropertyValue * ltvRatio;

          if (currentLoanValue < maxLoanAmount && remainingMonths > 0) {
            currentMonthlyAmount *= (1 + annualIncrease);
            monthsPossible += monthsThisYear;
            remainingMonths -= monthsThisYear;
            year += 1;
          }
        }

        totalLoanAmount = currentLoanValue;
      } else if (data.payoutAdjustmentType === "block" && data.blockPeriod && data.blockIncreaseRate) {
        const blockYears = parseInt(data.blockPeriod);
        const blockIncrease = parseFloat(data.blockIncreaseRate) / 100;
        let currentLoanValue = 0;
        let year = 1;
        let remainingMonths = maxMonths;
        let currentBlockMonthlyAmount = requiredMonthlyAmount;
        let currentBlockStart = 1;

        while (currentLoanValue < maxLoanAmount && remainingMonths > 0) {
          // Check if we're starting a new block (except for the first block)
          if (year > 1 && (year - currentBlockStart) % blockYears === 0) {
            currentBlockMonthlyAmount *= (1 + blockIncrease);
            currentBlockStart = year;
          }

          const monthsThisYear = Math.min(12, remainingMonths);
          const yearlyDisbursement = currentBlockMonthlyAmount * monthsThisYear;
          const startingBalance = cumulativeLoanBalance;
          cumulativeLoanBalance += yearlyDisbursement;

          //Check if disbursement exceeds LTV limit
          if (cumulativeLoanBalance > maxLoanAmount) {
            cumulativeLoanBalance = maxLoanAmount;
            break;
          }

          const averageBalance = (startingBalance + cumulativeLoanBalance) / 2;
          const yearlyInterest = (averageBalance * baseInterestRate) * (monthsThisYear / 12);

          //Check if interest accrual exceeds LTV limit
          if (cumulativeLoanBalance + yearlyInterest > maxLoanAmount) {
            const remainingRoom = maxLoanAmount - cumulativeLoanBalance;
            cumulativeLoanBalance += remainingRoom;
            totalInterest += remainingRoom;
            break;
          }

          cumulativeLoanBalance += yearlyInterest;
          totalDisbursed += yearlyDisbursement;
          totalInterest += yearlyInterest;

          const propertyAppreciation = currentPropertyValue * appreciationRate;
          totalAppreciation += propertyAppreciation;

          yearlyPayouts.push({
            year,
            monthlyAmount: currentBlockMonthlyAmount,
            totalDisbursed: yearlyDisbursement,
            interestAccrued: yearlyInterest,
            propertyValue: currentPropertyValue,
            propertyAppreciation: propertyAppreciation,
            ltvPercentage: (cumulativeLoanBalance / currentPropertyValue) * 100,
            monthsInYear: monthsThisYear
          });

          currentLoanValue = cumulativeLoanBalance;
          currentPropertyValue *= (1 + appreciationRate);
          maxLoanAmount = currentPropertyValue * ltvRatio;

          if (currentLoanValue < maxLoanAmount && remainingMonths > 0) {
            monthsPossible += monthsThisYear;
            remainingMonths -= monthsThisYear;
            year += 1;
          }
        }

        totalLoanAmount = currentLoanValue;
      }

      await fetch('/api/calculator-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id,
          propertyValue: parseFloat(data.propertyValue.replace(/,/g, '')),
          appreciationRate: parseFloat(data.appreciationRate),
          requiredMonthlyAmount: parseFloat(data.requiredMonthlyAmount.replace(/,/g, '')),
          payoutAdjustmentType: data.payoutAdjustmentType === 'annual' ? 'annual_increase' : 'block_period',
          annualIncreaseRate: data.annualIncreaseRate ? parseFloat(data.annualIncreaseRate) : null,
          blockPeriod: data.blockPeriod ? parseInt(data.blockPeriod) : null,
          blockIncreaseRate: data.blockIncreaseRate ? parseFloat(data.blockIncreaseRate) : null,
          calculationResult: {
            totalLoanAmount,
            interestRate: baseInterestRate,
            monthsPossible,
            maxLoanAmount,
            yearlyPayouts,
          }
        })
      });

      return {
        totalLoanAmount,
        interestRate: baseInterestRate,
        monthsPossible,
        maxLoanAmount,
        totalDisbursed,
        totalInterest,
        totalAppreciation,
        finalPropertyValue: currentPropertyValue,
        yearlyPayouts,
      };
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Calculation Complete",
        description: "Your reverse mortgage calculation is ready.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: CalculatorFormData) => {
    calculateMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="propertyValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl">Property Value</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      {...field}
                      className="pl-8 text-lg p-6"
                      placeholder="1,50,00,000"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enter the current market value of your property</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="appreciationRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl">Expected Property Appreciation Rate</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-lg p-6">
                      <SelectValue placeholder="Select appreciation rate" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1% per year</SelectItem>
                    <SelectItem value="2">2% per year</SelectItem>
                    <SelectItem value="3">3% per year</SelectItem>
                    <SelectItem value="4">4% per year</SelectItem>
                    <SelectItem value="5">5% per year</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Expected annual increase in property value
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requiredMonthlyAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl">Required Monthly Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      {...field}
                      className="pl-8 text-lg p-6"
                      placeholder="25,000"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>How much would you like to receive each month?</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payoutAdjustmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl">Payout Adjustment Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-lg p-6">
                      <SelectValue placeholder="Select payout adjustment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="annual">Annual Increase</SelectItem>
                    <SelectItem value="block">Fixed Block Period</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose how you want your payouts to be adjusted over time
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("payoutAdjustmentType") === "annual" && (
            <FormField
              control={form.control}
              name="annualIncreaseRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl">Annual Increase Rate</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-lg p-6">
                        <SelectValue placeholder="Select annual increase rate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0% (constant payouts)</SelectItem>
                      <SelectItem value="1">1% per year</SelectItem>
                      <SelectItem value="2">2% per year</SelectItem>
                      <SelectItem value="3">3% per year</SelectItem>
                      <SelectItem value="4">4% per year</SelectItem>
                      <SelectItem value="5">5% per year</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Your monthly payout will increase by this percentage each year
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {form.watch("payoutAdjustmentType") === "block" && (
            <>
              <FormField
                control={form.control}
                name="blockPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl">Block Period</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-lg p-6">
                          <SelectValue placeholder="Select block period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="3">3 years</SelectItem>
                        <SelectItem value="5">5 years</SelectItem>
                        <SelectItem value="7">7 years</SelectItem>
                        <SelectItem value="10">10 years</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Fixed monthly payout for the selected period
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="blockIncreaseRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl">Block Increase Rate</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-lg p-6">
                          <SelectValue placeholder="Select increase rate between blocks" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">5% increase</SelectItem>
                        <SelectItem value="10">10% increase</SelectItem>
                        <SelectItem value="15">15% increase</SelectItem>
                        <SelectItem value="20">20% increase</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Percentage increase in monthly payout after each block period
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl">Property Address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="text-lg p-6"
                    placeholder="Enter your property's full address"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ltvRatio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl">Loan to Value (LTV) Ratio</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-lg p-6">
                      <SelectValue placeholder="Select LTV ratio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="60">60%</SelectItem>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="85">85%</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Maximum loan amount as a percentage of property value
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interestRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl">Interest Rate (%)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type="number"
                      step="0.1"
                      min="8"
                      max="15"
                      className="text-lg p-6"
                      placeholder="Enter interest rate (8-15%)"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enter the annual interest rate (between 8% and 15%)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tenureType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xl">Tenure Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="maxLTV" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Maximum tenure based on LTV
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="fixed" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Fixed tenure
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("tenureType") === "fixed" && (
            <FormField
              control={form.control}
              name="fixedTenureMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl">Number of Months</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="12"
                      max="240"
                      className="text-lg p-6"
                      placeholder="Enter number of months (12-240)"
                    />
                  </FormControl>
                  <FormDescription>
                    Choose the fixed tenure period (between 1 to 20 years)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full text-lg"
            disabled={calculateMutation.isPending}
          >
            {calculateMutation.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                <Calculator className="mr-2 h-5 w-5" />
                Calculate
              </>
            )}
          </Button>
        </form>
      </Form>

      {result && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Calculation Results</CardTitle>
              <CardDescription>
                Based on your inputs, here's what you could receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Initial Property Value</p>
                  <p className="text-2xl font-bold">
                    ₹{Math.round(parseFloat(form.getValues("propertyValue").replace(/,/g, ''))).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Final Property Value</p>
                  <p className="text-2xl font-bold">
                    ₹{Math.round(result.finalPropertyValue).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Property Appreciation</p>
                  <p className="text-2xl font-bold">
                    ₹{Math.round(result.totalAppreciation).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maximum Loan Amount</p>
                  <p className="text-2xl font-bold">
                    ₹{Math.round(result.maxLoanAmount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount Disbursed</p>
                  <p className="text-2xl font-bold">
                    ₹{Math.round(result.totalDisbursed).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Interest Accrued</p>
                  <p className="text-2xl font-bold">
                    ₹{Math.round(result.totalInterest).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Loan Period</p>
                  <p className="text-2xl font-bold">
                    {Math.floor(result.monthsPossible / 12)} years {result.monthsPossible % 12} months
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Loan Amount</p>
                  <p className="text-2xl font-bold">
                    ₹{Math.round(result.totalLoanAmount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Year-wise Payout Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Year</th>
                        <th className="text-right p-2">Monthly Payout</th>
                        <th className="text-right p-2">Months</th>
                        <th className="text-right p-2">Annual Disbursed</th>
                        <th className="text-right p-2">Interest Accrued</th>
                        <th className="text-right p-2">Property Value</th>
                        <th className="text-right p-2">Appreciation</th>
                        <th className="text-right p-2">LTV %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.yearlyPayouts.map((payout) => (
                        <tr key={payout.year} className="border-b">
                          <td className="p-2">{payout.year}</td>
                          <td className="text-right p-2">₹{Math.round(payout.monthlyAmount).toLocaleString()}</td>
                          <td className="text-right p-2">{payout.monthsInYear}</td>
                          <td className="text-right p-2">₹{Math.round(payout.totalDisbursed).toLocaleString()}</td>
                          <td className="text-right p-2">₹{Math.round(payout.interestAccrued).toLocaleString()}</td>
                          <td className="text-right p-2">₹{Math.round(payout.propertyValue).toLocaleString()}</td>
                          <td className="text-right p-2">₹{Math.round(payout.propertyAppreciation).toLocaleString()}</td>
                          <td className="text-right p-2">{Math.round(payout.ltvPercentage)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}