<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', 'C:\xampp\htdocs\mergic\php-error.log');

require 'vendor/autoload.php'; // Include the Composer autoloader

use setasign\Fpdi\Fpdi;

header('Content-Type: application/json');

// Custom log file path
$customLogFile = 'C:\xampp\htdocs\mergic\file-order-log.log';

try {
    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        // Check if files were uploaded via POST request
        if (empty($_FILES['pdfs']['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'No PDFs provided']);
            exit;
        }

        // Initialize array to store uploaded file paths
        $uploadedFiles = [];

        // Handle file uploads
        foreach ($_FILES['pdfs']['tmp_name'] as $key => $tmpName) {
            // Construct upload path for each file
            $fileName = $_FILES['pdfs']['name'][$key];
            $uploadPath = 'uploads/' . $fileName;

            // Move uploaded file to upload directory
            if (move_uploaded_file($tmpName, $uploadPath)) {
                $uploadedFiles[$key] = $uploadPath;
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to upload file']);
                exit;
            }
        }

        // Sort the uploaded files by their keys to maintain the order
        ksort($uploadedFiles);

        // Log the order of the files to a custom log file
        file_put_contents($customLogFile, "Order of files:\n", FILE_APPEND);
        foreach ($uploadedFiles as $key => $filePath) {
            file_put_contents($customLogFile, "Key: $key, File: $filePath\n", FILE_APPEND);
        }

        // Perform PDF merging
        $outputFile = 'uploads/merged.pdf';
        $pdf = new FPDI();
        
        // Iterate through uploaded files and merge them
        foreach ($uploadedFiles as $filePath) {
            $pageCount = $pdf->setSourceFile($filePath);
            for ($i = 1; $i <= $pageCount; $i++) {
                $tplIdx = $pdf->importPage($i);
                $pdf->AddPage();
                $pdf->useTemplate($tplIdx);
            }
        }

        // Output merged PDF to file
        $pdf->Output('F', $outputFile);

        // Return JSON response with path to merged PDF
        echo json_encode(['file' => $outputFile]);
    } else {
        // Handle invalid request method
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    // Handle any exceptions that occur during script execution
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
