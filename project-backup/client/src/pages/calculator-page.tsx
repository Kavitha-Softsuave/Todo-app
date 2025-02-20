import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MortgageCalculator from "@/components/mortgage-calculator";
import SampleCalculations from "@/components/sample-calculations";
import UserProperties from "@/components/user-properties";
import CalculatorHistory from "@/components/calculator-history";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CalculatorPage() {
  const [_, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-8">
      <Button
        variant="ghost"
        className="mb-8"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-7xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Reverse Mortgage Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <MortgageCalculator />
          </CardContent>
        </Card>

        {/* User's actual calculations and properties */}
        <div className="space-y-8">
          <CalculatorHistory />
          <UserProperties />
        </div>

        {/* Sample calculations with visual separation */}
        <div className="pt-8 border-t border-border">
          <SampleCalculations />
        </div>
      </div>
    </div>
  );
}