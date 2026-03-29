<?php

namespace App\Modules\Forms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Mail\EmailContractInvite;
use App\Modules\Candidates\Models\Candidate;
use App\Modules\Forms\Models\EmailContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmailContractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $contracts = EmailContract::where('user_id', $request->user()->id)
            ->get()
            ->map(function ($contract) {
                return array_merge($contract->toArray(), [
                    'fields_count' => count($contract->fields ?? []),
                    'sent_count' => $contract->sent_count,
                ]);
            });

        return response()->json($contracts);
    }

    public function show(Request $request, EmailContract $emailContract): JsonResponse
    {
        $this->authorize('view', $emailContract);
        return response()->json($emailContract);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'template_path' => 'required|string',
            'fields' => 'required|array',
            'placeholders' => 'required|array',
            'mail_config' => 'required|array',
            'mail_config.subject' => 'required|string',
            'mail_config.body' => 'required|string',
            'mail_config.from' => 'required|email',
            'mail_config.send_copy_to_admin' => 'boolean',
        ]);

        $validated['user_id'] = $request->user()->id;

        $contract = EmailContract::create($validated);

        return response()->json($contract, 201);
    }

    public function update(Request $request, EmailContract $emailContract): JsonResponse
    {
        $this->authorize('update', $emailContract);

        $validated = $request->validate([
            'title' => 'string|max:255',
            'description' => 'nullable|string',
            'template_path' => 'string',
            'placeholders' => 'array',
            'mail_config' => 'array',
        ]);

        $emailContract->update($validated);

        return response()->json($emailContract);
    }

    public function destroy(Request $request, EmailContract $emailContract): JsonResponse
    {
        $this->authorize('delete', $emailContract);

        if ($emailContract->template_path) {
            Storage::disk('secure')->delete($emailContract->template_path);
        }

        $emailContract->delete();

        return response()->json(['message' => 'Email contract deleted successfully']);
    }

    public function uploadTemplate(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf',
        ]);

        $file = $request->file('file');
        $path = $file->store('email-contracts', 'secure');

        return response()->json([
            'path' => $path,
            'url' => Storage::disk('secure')->url($path),
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'contract_id' => 'required|exists:email_contracts,id',
        ]);

        $user = $request->user();
        $contract = EmailContract::findOrFail($validated['contract_id']);

        // Security check
        if ($contract->user_id !== $user->id) {
            abort(403, 'Unauthorized to send this contract');
        }

        $email = strtolower(trim($validated['email']));
        $token = Str::random(64);

        // Check if candidate already exists
        $candidate = Candidate::where('email', $email)
            ->whereRaw("COALESCE(data->>'source', '') = ?", ['email_contract'])
            ->whereRaw("COALESCE(data->>'email_contract_id', '')::integer = ?", [(string)$contract->id])
            ->first();

        if ($candidate) {
            $candidate->update([
                'name' => $validated['name'],
                'signing_token' => $token,
                'sent_for_signature_at' => now(),
                'contract_status' => $candidate->contract_status === 'signed' ? 'signed' : 'pending_candidate_signature',
            ]);
        } else {
            $candidate = Candidate::create([
                'name' => $validated['name'],
                'email' => $email,
                'contract_status' => 'pending_candidate_signature',
                'signing_token' => $token,
                'sent_for_signature_at' => now(),
                'data' => [
                    'source' => 'email_contract',
                    'email_contract_id' => $contract->id,
                    'submitted_via' => 'direct_email_invite',
                ],
            ]);
        }

        // Send email using configured mail template
        $frontendUrl = config('app.frontend_url', config('app.url'));
        $signUrl = rtrim($frontendUrl, '/') . '/candidate/sign/' . $candidate->signing_token;

        Mail::to($candidate->email)->send(new EmailContractInvite($candidate, $signUrl, $contract));

        // Increment sent count
        $contract->increment('sent_count');

        return response()->json([
            'message' => 'Contract invite sent successfully',
            'candidate' => $candidate,
        ], 201);
    }
}
