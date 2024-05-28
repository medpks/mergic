document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const fileButton = document.getElementById('file-button');
    const mergeButton = document.getElementById('merge-button');
    const dropArea = document.getElementById('drop-area');
    const pdfPreviewContainer = document.getElementById('pdf-preview-container');
    const downloadLink = document.getElementById('download-link');
    let selectedFiles = [];

    fileButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    dropArea.addEventListener('dragover', function(event) {
        event.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', function() {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', function(event) {
        event.preventDefault();
        dropArea.classList.remove('dragover');
        handleFiles(event.dataTransfer.files);
    });

    pdfPreviewContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-button')) {
            const index = parseInt(event.target.getAttribute('data-index'));
            selectedFiles.splice(index, 1);
            pdfPreviewContainer.removeChild(event.target.closest('.pdf-item'));
            updateFileIndices();
        }
    });

    new Sortable(pdfPreviewContainer, {
        animation: 150,
        onEnd: function(evt) {
            const item = selectedFiles.splice(evt.oldIndex, 1)[0];
            selectedFiles.splice(evt.newIndex, 0, item);
            updateFileIndices();
        }
    });

    mergeButton.addEventListener('click', mergePDFs);

    function handleFiles(files) {
        Array.from(files).forEach((file, index) => {
            selectedFiles.push(file);
            const reader = new FileReader();
            reader.onload = function(event) {
                renderPDFThumbnail(event.target.result, selectedFiles.length - 1);
            };
            reader.readAsArrayBuffer(file);
        });
        updateFileIndices();
    }

    function updateFileIndices() {
        pdfPreviewContainer.querySelectorAll('.delete-button').forEach((button, idx) => {
            button.setAttribute('data-index', idx);
        });

        pdfPreviewContainer.querySelectorAll('.page-number').forEach((span, idx) => {
            span.textContent = `Page ${idx + 1}`;
        });

        // Log the current order of files
        console.log('Updated file order:');
        selectedFiles.forEach((file, index) => {
            console.log(`File ${index + 1}: ${file.name}`);
        });
    }

    function renderPDFThumbnail(arrayBuffer, index) {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        loadingTask.promise.then(pdf => {
            return pdf.getPage(1).then(page => {
                const viewport = page.getViewport({ scale: 0.2 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                return page.render(renderContext).promise.then(() => {
                    const listItem = document.createElement('div');
                    listItem.className = 'pdf-item relative m-4';
                    listItem.innerHTML = `
                        <div class="pdf-preview border rounded shadow p-4 hover:shadow-lg">
                            <canvas class="w-full h-auto mb-2"></canvas>
                        </div>
                        <span class="page-number block text-center mb-2">Page ${index + 1}</span>
                        <button class="delete-button bg-red-500 text-white px-2 py-1 rounded w-full mt-2">Delete</button>
                    `;
                    listItem.querySelector('canvas').replaceWith(canvas);
                    pdfPreviewContainer.appendChild(listItem);
                    updateFileIndices(); // Update indices after adding a new thumbnail
                });
            });
        }, function(reason) {
            console.error(reason);
        });
    }

    function mergePDFs() {
        if (selectedFiles.length === 0) {
            alert('Please select one or more PDF files.');
            return;
        }

        const formData = new FormData();
        selectedFiles.forEach((file, index) => {
            formData.append(`pdfs[${index}]`, file);
        });

        // Log the order of files being sent
        console.log('Order of files being sent:');
        selectedFiles.forEach((file, index) => {
            console.log(`File ${index + 1}: ${file.name}`);
        });

        fetch('merge.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(data => {
            try {
                const json = JSON.parse(data);
                if (json.file) {
                    const downloadUrl = json.file;
                    downloadLink.innerHTML = `<a href="${downloadUrl}" download class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Download Merged PDF</a>`;
                } else {
                    console.error('Error:', json.error);
                    alert(`Error: ${json.error}`);
                }
            } catch (e) {
                console.error('Response is not valid JSON:', data);
                alert('There was an error processing your request. Please try again.');
            }
        })
        .catch(error => console.error('Error:', error));
    }
});
