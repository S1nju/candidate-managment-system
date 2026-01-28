<?php

namespace App\Modules\Forms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Forms\Models\Form;
use App\Modules\Candidates\Models\Candidate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PublicFormController extends Controller
{
    public function __construct(protected \App\Modules\Candidates\Services\DiditService $diditService)
    {
    }

    /**
     * Get form by UUID for public access
     */
    public function show(string $uuid)
    {
        $form = Form::with('fields')
            ->where('uuid', $uuid)
            ->where('status', 'active')
            ->firstOrFail();

        return response()->json($form);
    }

    /**
     * Submit a public form
     */
    public function submit(Request $request, string $uuid, \App\Modules\Forms\Services\ContractGenerationService $contractService)
    {
        $form = Form::with('fields')
            ->where('uuid', $uuid)
            ->where('status', 'active')
            ->firstOrFail();

        // Build dynamic validation rules based on form fields
        $rules = [
            'fields.name' => 'required|string|max:255',
            'fields.email' => 'required|email|max:255',
        ];
        
        foreach ($form->fields as $field) {
            if (in_array($field->name, ['name', 'email'])) continue;
            
            $fieldRules = [];
            
            if ($field->validation_rules) {
                if (isset($field->validation_rules['required']) && $field->validation_rules['required']) {
                    $fieldRules[] = 'required';
                }
                if (isset($field->validation_rules['max'])) {
                    $fieldRules[] = 'max:' . $field->validation_rules['max'];
                }
                if (isset($field->validation_rules['min'])) {
                    $fieldRules[] = 'min:' . $field->validation_rules['min'];
                }
            }

            // Add type-specific validation
            if ($field->type === 'email') {
                $fieldRules[] = 'email';
                $fieldRules[] = 'string';
            } elseif ($field->type === 'number') {
                $fieldRules[] = 'numeric';
            } elseif ($field->type === 'file') {
                $fieldRules[] = 'file';
            } elseif (in_array($field->type, ['text', 'textarea'])) {
                $fieldRules[] = 'string';
            }

            $rules['fields.' . $field->name] = $fieldRules;
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $fieldsData = $request->input('fields', []);

        // Handle file uploads
        foreach ($form->fields as $field) {
            if ($field->type === 'file' && $request->hasFile('fields.' . $field->name)) {
                $file = $request->file('fields.' . $field->name);
                $path = $file->store('form_uploads', 'secure');
                $fieldsData[$field->name] = [
                    'path' => $path,
                    'name' => $file->getClientOriginalName(),
                    'type' => $file->getClientMimeType(),
                ];
            }
        }

        $candidateData = [
            'form_id' => $form->id,
            'name' => $fieldsData['name'] ?? $fieldsData['full_name'] ?? 'Unknown',
            'email' => $fieldsData['email'],
            'phone' => $fieldsData['phone'] ?? null,
            'position' => $fieldsData['position'] ?? null,
            'gender' => $fieldsData['gender'] ?? null,
            'nationality' => $fieldsData['nationality'] ?? null,
            'dob' => $fieldsData['dob'] ?? null,
            'address' => $fieldsData['address'] ?? null,
            'social_security_number' => $fieldsData['social_security_number'] ?? $fieldsData['ssn'] ?? null,
            'emergency_phone' => $fieldsData['emergency_phone'] ?? null,
            'recruitment_city' => $fieldsData['recruitment_city'] ?? null,
            'animator_name' => $fieldsData['animator_name'] ?? null,
            'product_justcost' => $fieldsData['product_justcost'] ?? null,
            'contract_type' => $fieldsData['contract_type'] ?? null,
            'start_date' => $fieldsData['start_date'] ?? null,
            'contract_status' => 'pending',
            'data' => $fieldsData, // Store all form data as JSON
        ];

        // If KYC is enabled, return redirect URL
        if ($form->kyc_enabled) {
            try {
                $session = $this->diditService->createSession(array_merge($candidateData, [
                    'dob' => $fields['dob'] ?? null,
                ]));

                return response()->json([
                    'message' => 'Identity verification required',
                    'kyc_required' => true,
                    'kyc_redirect_url' => $session['url'],
                ], 201);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Failed to initiate KYC.',
                    'error' => $e->getMessage()
                ], 500);
            }
        }

        // Create candidate immediately if KYC is disabled
        $candidate = Candidate::create($candidateData);

        // Generate contracts automatically
        $contractService->generateForCandidate($candidate);

        return response()->json([
            'message' => 'Form submitted successfully',
            'candidate_id' => $candidate->id,
        ], 201);
    }
}
