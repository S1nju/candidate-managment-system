<?php
 
namespace App\Modules\Analytics\Http\Controllers;
 
use App\Http\Controllers\Controller;
use App\Modules\Documents\Models\Document;
use App\Modules\Candidates\Models\Candidate;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
 
class AnalyticsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        // Unsigned documents count
        $unsignedCount = Document::where('status', '!=', 'signed')->count();
 
        // Top 5 employees who haven't signed their documents yet
        $topUnsigned = User::select('users.id', 'users.name')
            ->leftJoin('documents', function($join) {
                $join->on('users.id', '=', 'documents.assigned_to')
                    ->where('documents.status', '!=', 'signed');
            })
            ->selectRaw('COUNT(documents.id) as unsigned_count')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('unsigned_count')
            ->limit(5)
            ->get();
 
        // Documents signed per day (last 14 days)
        $signedPerDay = Document::where('status', 'signed')
            ->where('updated_at', '>=', now()->subDays(14))
            ->selectRaw('updated_at::date as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();
 
        return response()->json([
            'unsigned_count' => $unsignedCount,
            'top_unsigned' => $topUnsigned,
            'signed_per_day' => $signedPerDay,
        ]);
    }
 
    public function candidateAnalytics(Request $request): JsonResponse
    {
        $year = $request->input('year', now()->year);
        
        // Get current month statistics
        $currentMonth = now()->month;
        $currentYear = now()->year;
        
        $thisMonthCount = Candidate::whereYear('created_at', $currentYear)
            ->whereMonth('created_at', $currentMonth)
            ->count();
        
        // Get status counts
        $statusCounts = Candidate::select('contract_status', DB::raw('count(*) as count'))
            ->groupBy('contract_status')
            ->pluck('count', 'contract_status')
            ->toArray();
        
        $signedCount = $statusCounts['signed'] ?? 0;
        $pendingCount = $statusCounts['pending'] ?? 0;
        $rejectedCount = $statusCounts['rejected'] ?? 0;
        $totalCount = Candidate::count();
        
        // Get monthly data for the selected year
        $monthlyData = Candidate::select(
                DB::raw("CAST(EXTRACT(MONTH FROM created_at) AS INTEGER) as month"),
                DB::raw('COUNT(*) as applications'),
                DB::raw("SUM(CASE WHEN contract_status = 'signed' THEN 1 ELSE 0 END) as signed"),
                DB::raw("SUM(CASE WHEN contract_status = 'rejected' THEN 1 ELSE 0 END) as rejected")
            )
            ->whereYear('created_at', $year)
            ->groupBy(DB::raw("CAST(EXTRACT(MONTH FROM created_at) AS INTEGER)"))
            ->orderBy('month')
            ->get()
            ->keyBy('month');
        
        // Fill in missing months with zeros
        $months = [];
        for ($i = 1; $i <= 12; $i++) {
            $monthData = $monthlyData->get($i);
            $months[] = [
                'month' => $i,
                'applications' => $monthData->applications ?? 0,
                'signed' => $monthData->signed ?? 0,
                'rejected' => $monthData->rejected ?? 0,
            ];
        }
        
        // Get available years
        $availableYears = Candidate::select(DB::raw('CAST(EXTRACT(YEAR FROM created_at) AS INTEGER) as year'))
            ->distinct()
            ->orderBy('year', 'desc')
            ->pluck('year')
            ->toArray();
        
        if (empty($availableYears)) {
            $availableYears = [$currentYear];
        }
        
        return response()->json([
            'current_stats' => [
                'this_month' => $thisMonthCount,
                'signed' => $signedCount,
                'pending' => $pendingCount,
                'rejected' => $rejectedCount,
                'total' => $totalCount,
                'acceptance_rate' => $totalCount > 0 ? round(($signedCount / $totalCount) * 100) : 0,
            ],
            'monthly_data' => $months,
            'available_years' => $availableYears,
        ]);
    }
}
