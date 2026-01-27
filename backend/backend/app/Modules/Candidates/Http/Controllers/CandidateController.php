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
        $candidates = $query->with('form')->orderByDesc('created_at')->paginate($perPage);
        return response()->json([
            'data' => $candidates->items(),
            'total' => $candidates->total(),
            'current_page' => $candidates->currentPage(),
            'last_page' => $candidates->lastPage(),
        ]);
    }

    public function store(\App\Modules\Candidates\Http\Requests\StoreCandidateRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('candidates/photos', 'public');
            $data['photo_url'] = '/storage/' . $path;
            unset($data['photo']); // Remove file object from data
        }

        if ($request->hasFile('cv')) {
             $path = $request->file('cv')->store('candidates/cvs', 'public');
             $data['cv_url'] = '/storage/' . $path;
             unset($data['cv']);
        }
        
        // Ensure data field is set if null (optional, depending on model)
        // $data['data'] = $data['data'] ?? [];

        $candidate = Candidate::create($data);
        return response()->json($candidate, 201);
    }

    public function show(Candidate $candidate): JsonResponse
    {
        return response()->json($candidate->load(['signature', 'form', 'assignedTo']));
    }

    public function update(Request $request, Candidate $candidate): JsonResponse
    {
        $data = $request->validate([
            'signature_id' => 'nullable|exists:signatures,id',
            'status' => 'nullable|string',
        ]);
        $candidate->update($data);
        return response()->json($candidate);
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
}
