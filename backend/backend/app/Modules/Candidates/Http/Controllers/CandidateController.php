<?php

namespace App\Modules\Candidates\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Candidates\Models\Candidate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CandidateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Candidate::query();
        $user = $request->user();

        // Security: Non-admins only see their assigned candidates
        if (! $user->hasRole('admin')) {
            $query->where('assigned_to', $user->id);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%$search%")
                    ->orWhere('email', 'ilike', "%$search%")
                    ->orWhere('position', 'ilike', "%$search%")
                    ->orWhere('phone', 'ilike', "%$search%");
            });
        }

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('contract_status', $status);
            }
        }

        $perPage = (int) $request->query('per_page', 15);
        $candidates = $query->with(['form', 'assignedTo'])->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $candidates->items(),
            'total' => $candidates->total(),
            'current_page' => $candidates->currentPage(),
            'last_page' => $candidates->lastPage(),
            'per_page' => $candidates->perPage(),
        ]);
    }

    public function store(\App\Modules\Candidates\Http\Requests\StoreCandidateRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('candidates/photos', 'secure');
            $data['photo_url'] = $path;
            unset($data['photo']); // Remove file object from data
        }

        if ($request->hasFile('cv')) {
            $path = $request->file('cv')->store('candidates/cvs', 'secure');
            $data['cv_url'] = $path;
            unset($data['cv']);
        }

        // Ensure data field is set if null (optional, depending on model)
        // $data['data'] = $data['data'] ?? [];

        $candidate = Candidate::create($data);

        return response()->json($candidate, 201);
    }

    public function show(Candidate $candidate): JsonResponse
    {
        return response()->json($candidate->load(['signature', 'form.contracts', 'assignedTo', 'generatedContracts']));
    }

    public function update(Request $request, Candidate $candidate): JsonResponse
    {
        try {
            $data = $request->validate([
                'name' => 'nullable|string|max:255',
                'email' => 'nullable|email|unique:candidates,email,'.$candidate->id,
                'phone' => 'nullable|string|max:50',
                'dob' => 'nullable|date',
                'nationality' => 'nullable|string|max:100',
                'address' => 'nullable|string|max:1000',
                'social_security_number' => 'nullable|string|max:50',
                'emergency_phone' => 'nullable|string|max:50',
                'position' => 'nullable|string|max:255',
                'contract_type' => 'nullable|string|max:100',
                'start_date' => 'nullable|date',
                'recruitment_city' => 'nullable|string|max:255',
                'animator_name' => 'nullable|string|max:255',
                'product_justcost' => 'nullable|string|max:255',
                'gender' => 'nullable|string|max:100',
                'status' => 'nullable|string',
                'signature_id' => 'nullable|exists:signatures,id',
                'data' => 'nullable|array',
            ]);

            $candidate->update($data);
            \Illuminate\Support\Facades\Log::info('Candidate updated: '.$candidate->id);

            return response()->json($candidate);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::error('Candidate update validation failed: '.json_encode($e->errors()));
            throw $e;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Candidate update error: '.$e->getMessage());

            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function assign(Request $request, Candidate $candidate): JsonResponse
    {
        $validated = $request->validate([
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $candidate->update(['assigned_to' => $validated['assigned_to']]);

        return response()->json([
            'message' => 'Candidate assigned successfully',
            'candidate' => $candidate->load('assignedTo'),
        ]);
    }

    public function generateMailtoLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'candidate_ids' => 'required|array',
            'candidate_ids.*' => 'exists:candidates,id',
        ]);

        $candidates = Candidate::whereIn('id', $validated['candidate_ids'])->get();
        $emails = $candidates->pluck('email')->unique()->implode(',');

        $subject = rawurlencode('Regarding your application');
        $body = rawurlencode("Hello,\n\nWe are reaching out to you regarding your application...");

        $mailtoLink = "mailto:?bcc={$emails}&subject={$subject}&body={$body}";

        return response()->json([
            'mailto_link' => $mailtoLink,
        ]);
    }

    public function downloadFile(Request $request)
    {
        $path = $request->query('path');

        if (! $path) {
            abort(400, 'No path provided');
        }

        $path = rawurldecode($path);

        if (! \Illuminate\Support\Facades\Storage::disk('secure')->exists($path)) {
            abort(404, 'File not found');
        }

        return \Illuminate\Support\Facades\Storage::disk('secure')->response($path);
    }
}
