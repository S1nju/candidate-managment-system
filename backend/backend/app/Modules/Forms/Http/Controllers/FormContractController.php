<?php

namespace App\Modules\Forms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Forms\Models\Form;
use App\Modules\Forms\Models\FormContract;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FormContractController extends Controller
{
    /**
     * Display a listing of contracts for a form.
     */
    public function index(string $formId)
    {
        $form = Form::findOrFail($formId);
        return response()->json($form->contracts);
    }

    /**
     * Store a newly created contract for a form.
     */
    public function store(Request $request, string $formId)
    {
        $form = Form::findOrFail($formId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'template' => 'required|file|mimes:pdf,docx|max:5120',
            'placeholders' => 'nullable|array',
            'order' => 'integer',
        ]);

        $path = $request->file('template')->store('form_contracts', 'secure');

        $contract = $form->contracts()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'template_path' => $path,
            'placeholders' => $validated['placeholders'] ?? [],
            'order' => $validated['order'] ?? 0,
        ]);

        return response()->json($contract, 201);
    }

    /**
     * Download the contract template.
     */
    public function downloadTemplate(string $formId, string $id)
    {
        $contract = FormContract::where('form_id', $formId)->findOrFail($id);
        
        if (!Storage::disk('secure')->exists($contract->template_path)) {
            abort(404, 'Template file not found.');
        }

        return Storage::disk('secure')->download($contract->template_path, $contract->name . '.' . pathinfo($contract->template_path, PATHINFO_EXTENSION));
    }

    /**
     * Download a generated contract.
     */
    public function downloadGenerated(string $id)
    {
        $generated = \App\Modules\Forms\Models\GeneratedContract::findOrFail($id);
        
        if (!Storage::disk('secure')->exists($generated->file_path)) {
            abort(404, 'Generated contract file not found.');
        }

        return Storage::disk('secure')->download($generated->file_path, basename($generated->file_path));
    }

    /**
     * Display the specified contract.
     */
    public function show(string $formId, string $id)
    {
        $contract = FormContract::where('form_id', $formId)->findOrFail($id);
        return response()->json($contract);
    }

    /**
     * Update the specified contract.
     */
    public function update(Request $request, string $formId, string $id)
    {
        $contract = FormContract::where('form_id', $formId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'template' => 'nullable|file|mimes:pdf,docx|max:5120',
            'placeholders' => 'nullable|array',
            'order' => 'integer',
        ]);

        if ($request->hasFile('template')) {
            // Delete old file
            if ($contract->template_path) {
                Storage::disk('secure')->delete($contract->template_path);
            }
            $path = $request->file('template')->store('form_contracts', 'secure');
            $validated['template_path'] = $path;
        }

        $contract->update($validated);

        return response()->json($contract);
    }

    /**
     * Remove the specified contract.
     */
    public function destroy(string $formId, string $id)
    {
        $contract = FormContract::where('form_id', $formId)->findOrFail($id);
        
        // Delete file
        if ($contract->template_path) {
            Storage::disk('secure')->delete($contract->template_path);
        }

        $contract->delete();

        return response()->json(['message' => 'Contract deleted successfully']);
    }
}
