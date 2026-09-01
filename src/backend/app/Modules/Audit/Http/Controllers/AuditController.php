<?php

namespace App\Modules\Audit\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 20);
 
        $query = AuditLog::with(['user', 'auditable'])
            ->latest();
 
        // Filter by user
        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }
 
        // Filter by action
        if ($request->filled('action') && $request->action !== 'all') {
            $query->where('action', $request->action);
        }
 
        // Text Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%");
                })
                ->orWhere('action', 'like', "%{$search}%")
                ->orWhere('ip_address', 'like', "%{$search}%")
                ->orWhere('metadata', 'like', "%{$search}%");
            });
        }

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }
 
        $logs = $query->paginate($perPage);
 
        return response()->json($logs);
    }

    /**
     * Get unique actions and users for filtering.
     */
    public function filters(): JsonResponse
    {
        $actions = AuditLog::select('action')->distinct()->pluck('action');
        $users = \App\Models\User::select('id', 'name')->whereHas('auditLogs')->get();

        return response()->json([
            'actions' => $actions,
            'users' => $users
        ]);
    }
}
