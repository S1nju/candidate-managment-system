<?php

namespace App\Modules\Candidates\Http\Controllers;

use App\Modules\Candidates\Models\Candidate;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CandidateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Candidate::query();
        if ($search = $request->query('search')) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', "%$search%")
                  ->orWhere('email', 'ilike', "%$search%")
                  ->orWhere('position', 'ilike', "%$search%")
                  ->orWhere('phone', 'ilike', "%$search%")
                ;
            });
        }
        $perPage = (int) $request->query('per_page', 15);
        $candidates = $query->orderByDesc('created_at')->paginate($perPage);
        return response()->json([
            'data' => $candidates->items(),
            'total' => $candidates->total(),
            'current_page' => $candidates->currentPage(),
            'last_page' => $candidates->lastPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:30',
            'position' => 'nullable|string|max:255',
            'gender' => 'nullable|string',
            'nationality' => 'nullable|string',
            'dob' => 'nullable|date',
            'address' => 'nullable|string',
            'social_security_number' => 'nullable|string|size:15',
            'emergency_phone' => 'nullable|string',
            'recruitment_city' => 'nullable|string',
            'animator_name' => 'nullable|string',
            'product_justcost' => 'nullable|string',
            'contract_type' => 'nullable|string',
            'start_date' => 'nullable|date',
            'data' => 'nullable|array',
        ]);

        if (isset($data['data']) && is_array($data['data'])) {
            // No encoding needed if handled by casts, but verifying model setup
            // $data['data'] = json_encode($data['data']); 
        }

        $candidate = Candidate::create($data);
        return response()->json($candidate, 201);
    }

    public function show(Candidate $candidate): JsonResponse
    {
        return response()->json($candidate->load('signature'));
    }

    public function update(Request $request, Candidate $candidate): JsonResponse
    {
        $data = $request->validate([
            'signature_id' => 'nullable|exists:signatures,id',
            'status' => 'nullable|string',
            // Add other fields if editable by admin
        ]);
        $candidate->update($data);
        return response()->json($candidate);
    }
}
