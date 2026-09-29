<?php

namespace App\Modules\Forms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Forms\Models\Form;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FormController extends Controller
{
    /**
     * Display a listing of forms.
     */
    public function index()
    {
        $forms = Form::with(['fields' => function ($q) {
            $q->orderBy('page')->orderBy('order');
        }, 'creator'])
            ->where('created_by', Auth::id())
            ->orWhereHas('creator', function ($query) {
                $query->whereHas('roles', function ($q) {
                    $q->where('name', 'admin');
                });
            })
            ->latest()
            ->get();

        return response()->json($forms);
    }

    /**
     * Store a newly created form.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:draft,active,disabled',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'kyc_enabled' => 'boolean',
            'fields' => 'required|array',
            'fields.*.type' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.name' => 'required|string',
            'fields.*.validation_rules' => 'nullable|array',
            'fields.*.order' => 'integer',
            'fields.*.page' => 'nullable|integer',
            'fields.*.page_title' => 'nullable|string|max:255',
            'fields.*.options' => 'nullable|array',
            'fields.*.conditions' => 'nullable|array',
        ]);

        $form = Form::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'draft',
            'color' => $validated['color'] ?? '#3b82f6',
            'kyc_enabled' => $validated['kyc_enabled'] ?? false,
            'created_by' => Auth::id(),
        ]);

        foreach ($validated['fields'] as $index => $fieldData) {
            $form->fields()->create([
                'type' => $fieldData['type'],
                'label' => $fieldData['label'],
                'name' => $fieldData['name'],
                'validation_rules' => $fieldData['validation_rules'] ?? null,
                'order' => $fieldData['order'] ?? $index,
                'page' => $fieldData['page'] ?? 1,
                'page_title' => $fieldData['page_title'] ?? null,
                'options' => $fieldData['options'] ?? null,
                'conditions' => $fieldData['conditions'] ?? null,
            ]);
        }

        return response()->json($form->load('fields'), 201);
    }

    /**
     * Display the specified form.
     */
    public function show(string $id)
    {
        $form = Form::with(['fields' => function ($q) {
            $q->orderBy('page')->orderBy('order');
        }])->findOrFail($id);

        return response()->json($form);
    }

    /**
     * Update the specified form.
     */
    public function update(Request $request, string $id)
    {
        $form = Form::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:draft,active,disabled',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'kyc_enabled' => 'boolean',
            'role_id' => 'nullable|exists:roles,id',
            'completion_attachment_path' => 'nullable|string',
            'fields' => 'sometimes|array',
            'fields.*.id' => 'nullable|exists:form_fields,id',
            'fields.*.type' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.name' => 'required|string',
            'fields.*.validation_rules' => 'nullable|array',
            'fields.*.order' => 'integer',
            'fields.*.page' => 'nullable|integer',
            'fields.*.page_title' => 'nullable|string|max:255',
            'fields.*.options' => 'nullable|array',
            'fields.*.conditions' => 'nullable|array',
        ]);

        $form->update($validated);

        if (isset($validated['fields'])) {
            // Delete fields not in the update
            $fieldIds = collect($validated['fields'])->pluck('id')->filter();
            $form->fields()->whereNotIn('id', $fieldIds)->delete();

            foreach ($validated['fields'] as $index => $fieldData) {
                $fieldAttributes = [
                    'type' => $fieldData['type'],
                    'label' => $fieldData['label'],
                    'name' => $fieldData['name'],
                    'validation_rules' => $fieldData['validation_rules'] ?? null,
                    'order' => $fieldData['order'] ?? $index,
                    'page' => $fieldData['page'] ?? 1,
                    'page_title' => $fieldData['page_title'] ?? null,
                    'options' => $fieldData['options'] ?? null,
                    'conditions' => $fieldData['conditions'] ?? null,
                ];

                if (isset($fieldData['id'])) {
                    $form->fields()->where('id', $fieldData['id'])->update($fieldAttributes);
                } else {
                    $form->fields()->create($fieldAttributes);
                }
            }
        }

        return response()->json($form->fresh('fields'));
    }

    /**
     * Remove the specified form.
     */
    public function destroy(string $id)
    {
        $form = Form::findOrFail($id);
        $form->delete();

        return response()->json(['message' => 'Form deleted successfully']);
    }

    /**
     * Duplicate a form with its fields and contract templates.
     * The copy is a draft with a fresh uuid (so a new public link / QR code).
     */
    public function duplicate(string $id)
    {
        $source = Form::with(['fields', 'contracts'])->findOrFail($id);

        $copy = DB::transaction(function () use ($source) {
            $copy = Form::create([
                'title' => $source->title.' (copie)',
                'description' => $source->description,
                'status' => 'draft',
                'color' => $source->color,
                'kyc_enabled' => $source->kyc_enabled,
                'role_id' => $source->role_id,
                'created_by' => Auth::id(),
            ]);

            foreach ($source->fields as $field) {
                $copy->fields()->create($field->only([
                    'page', 'page_title', 'type', 'label', 'name',
                    'validation_rules', 'order', 'options', 'conditions',
                ]));
            }

            $secure = Storage::disk('secure');
            foreach ($source->contracts as $contract) {
                $attributes = $contract->only([
                    'name', 'description', 'placeholders', 'annex_rules',
                    'font_family', 'font_size', 'order',
                ]);

                // Templates are deleted with their contract, so each copy needs its own file.
                $extension = pathinfo($contract->template_path, PATHINFO_EXTENSION);
                $newPath = 'form_contracts/'.Str::uuid().($extension ? '.'.$extension : '');
                if ($contract->template_path && $secure->exists($contract->template_path)) {
                    $secure->copy($contract->template_path, $newPath);
                } else {
                    $newPath = $contract->template_path;
                }

                $copy->contracts()->create($attributes + ['template_path' => $newPath]);
            }

            if ($source->completion_attachment_path) {
                $public = Storage::disk('public');
                if ($public->exists($source->completion_attachment_path)) {
                    $ext = pathinfo($source->completion_attachment_path, PATHINFO_EXTENSION);
                    $newAttachment = 'form-attachments/'.Str::uuid().($ext ? '.'.$ext : '');
                    $public->copy($source->completion_attachment_path, $newAttachment);
                    $copy->update(['completion_attachment_path' => $newAttachment]);
                }
            }

            return $copy;
        });

        return response()->json($copy->load('fields'), 201);
    }

    /**
     * Upload an attachment to be sent on contract completion.
     */
    public function uploadCompletionAttachment(Request $request, string $id)
    {
        $form = Form::findOrFail($id);

        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,jpg,png|max:10240', // 10MB max
        ]);

        if ($request->hasFile('file')) {
            // Delete old one if exists
            if ($form->completion_attachment_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($form->completion_attachment_path);
            }

            $path = $request->file('file')->store('form-attachments', 'public');

            $form->update(['completion_attachment_path' => $path]);

            return response()->json([
                'message' => 'Attachment uploaded successfully',
                'path' => $path,
                'form' => $form->fresh('fields'),
            ]);
        }

        return response()->json(['message' => 'No file provided'], 400);
    }
}
