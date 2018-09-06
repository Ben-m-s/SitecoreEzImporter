﻿define(["sitecore"], function(Sitecore) {
    var DataImporter = Sitecore.Definitions.App.extend({
        uploadedFiles: [],

        initialize: function() {
            this.on("upload-fileUploaded", this.FileUploaded, this);
            $.ajax({
                url: "/sitecore/api/ssc/EzImporter-Controllers/Import/1/DefaultSettings",
                type: "GET",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                context: this,
                success: function (data) {
                    var app = this;
                    app.ExistingItemHandlingDataSource.on("change:hasItems", function () {
                        app.ExistingItemHandling.set("selectedValue", data.ExistingItemHandling);
                    });
                    app.InvalidLinkHandlingDataSource.on("change:hasItems", function () {
                        app.InvalidLinkHandling.set("selectedValue", data.InvalidLinkHandling);
                    });
                    app.DataStructureTypeDataSource.on("change:hasItems", function () {
                      app.DataStructureType.set("selectedValue", data.DataStructureType);
                    });
                    this.CsvDelimiter.viewModel.text(data.CsvDelimiter);
                    this.QuotationMark.viewModel.text(data.QuotationMark);
                    this.MultipleValuesImportSeparator.viewModel.text(data.MultipleValuesSeparator);
                    this.FirstRowAsColumnNamesCheckBox.set("isChecked", data.FirstRowAsColumnNames);
                },
            });
        },

        //Called by the main button. Indirectly triggers ImportData once all files uploaded
        UploadFiles: function () {
            console.log(this.SourceFile.viewModel.totalFiles());
            if (this.SourceFile.viewModel.totalFiles() == 0) {
                this.MessageBar.removeMessages();
                this.MessageBar.addMessage("error", "Please select file(s) to import");
                return;
            }
            if (this.uploadedFiles.length == this.SourceFile.viewModel.totalFiles()) {
                this.MessageBar.removeMessages();
                this.MessageBar.addMessage("notification", "File(s) have already been imported.");
                return;
            }
            this.ProgressIndicator.set('isBusy', true);
            if (this.SourceFile.viewModel.totalFiles() > 0) {
                this.SourceFile.viewModel.upload();
            }
        },

        FileUploaded: function (model) {
            this.uploadedFiles.push(model.itemId);
            this.SourceFile.viewModel.refreshNumberFiles();
            if (this.SourceFile.viewModel.globalPercentage() === 100) {
                this.MessageBar.removeMessages();
                this.ImportData();
            }
        },

        ImportData: function () {
            var location = this.ImportLocationTreeView.viewModel.selectedItemId();
            var language = this.TargetLanguageCombo.viewModel.selectedItemId();
            var existingItemHandling = this.ExistingItemHandling.viewModel.selectedItemId();
            var invalidLinkHandling = this.InvalidLinkHandling.viewModel.selectedItem().itemName;
            var dataStructureType = this.DataStructureType.viewModel.selectedItem().itemName;
            var csvDelimiter = this.CsvDelimiter.viewModel.text();
            var quotationMark = this.QuotationMark.viewModel.text();
            var multipleValuesSeparator = this.MultipleValuesImportSeparator.viewModel.text();
            var mappingId = this.ExistingMapping.viewModel.selectedItemId();
            var firstRowAsColumnNames = this.FirstRowAsColumnNamesCheckBox.viewModel.isChecked();
            if (language == null) {
                this.MessageBar.addMessage("error", "Please select language for import");
            }
            if (location == null) {
                this.MessageBar.addMessage("error", "Please select import location");
            }
            for (var i = 0; i < this.uploadedFiles.length; i++) {
                console.log("mappingId", mappingId, "mediaItemId", this.uploadedFiles[i]);
                var item = {
                    MappingId: mappingId,
                    ImportLocationId: location,
                    Language: language,
                    ExistingItemHandling: existingItemHandling,
                    InvalidLinkHandling: invalidLinkHandling,
                    DataStructureType: dataStructureType,
                    CsvDelimiter: csvDelimiter,
                    QuotationMark: quotationMark,
                    MultipleValuesSeparator: multipleValuesSeparator,
                    MediaItemId: this.uploadedFiles[i],
                    FirstRowAsColumnNames: firstRowAsColumnNames
                };
                $.ajax({
                    url: "/sitecore/api/ssc/EzImporter-Controllers/Import/1/Import",
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    context: this,
                    success: function (data) {
                        if (data.HasError == true) {
                            this.ErrorDialogMessageBar.addMessage("error", data.ErrorMessage);
                            this.ErrorDialogExpanderText.set("text", data.ErrorDetail);
                            this.ProgressIndicator.set('isBusy', false);
                            this.ErrorDialog.show();
                        } else {
                            this.LogInfo.viewModel.text(data.Log);
                            this.ProgressIndicator.set('isBusy', false);
                        }
                    },
                    data: JSON.stringify(item)
                });
            }

        },

        CloseErrorDialog: function() {
            this.ErrorDialog.hide();
        }
    });

    return DataImporter;
});