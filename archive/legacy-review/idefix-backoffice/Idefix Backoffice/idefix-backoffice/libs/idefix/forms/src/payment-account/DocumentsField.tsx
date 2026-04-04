import React, { FC, ReactNode, SyntheticEvent, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import { Field, FieldArrayRenderProps } from "formik";

import { AccountDocument, DIALOG, Photo } from "@idefix-backoffice/idefix/types";
import { Mde } from "@idefix-backoffice/idefix/components";
import { dialogsSlice } from "@idefix-backoffice/idefix/store";

import { DatePickerField } from "../formik-fields/DatePickerField";
import { DropzoneField } from "../formik-fields/DropzoneField";
import { MarkdownField } from "../formik-fields/MarkdownField";
import { RenderKycDocument } from "../formik-fields/components/RenderKycDocument";

const StyledIconButton = styled(IconButton)({
  position: "absolute",
  top: 0,
  right: 0,
  zIndex: 9999
});

const TYPE_BUTTONS = [
  { label: "Document", key: "photo" },
  { label: "Note", key: "content" }
];

const getTabLabel = (document: AccountDocument) => (document.photoId ? document.name : "Note");

function TabPanel(props: { value: number; index: number; children: React.ReactNode }) {
  const { children, value, index, ...other } = props;
  return (
    <Typography component="div" role="tabpanel" hidden={value !== index} {...other}>
      <Box p={3}>{children}</Box>
    </Typography>
  );
}

interface Props {
  disableIconButton?: boolean;
  arrayHelpers: FieldArrayRenderProps;
  setDocumentsForRemove?: React.Dispatch<React.SetStateAction<AccountDocument[]>>;
}

const DocumentsField: FC<Props> = ({ disableIconButton, arrayHelpers, setDocumentsForRemove }) => {
  const dispatch = useDispatch();
  const [tab, setTab] = useState<number>(0);
  const [newDocumentType, setNewDocumentType] = useState("photo");

  const {
    push,
    remove,
    form: { values, errors, setFieldValue, isSubmitting }
  } = arrayHelpers;

  const documents = (values.documents || []) as AccountDocument[];

  const handleChangeTab = (event: SyntheticEvent<Element, Event>, newValue: number) => setTab(newValue);

  const handleNewContent = (newValue: string) => push({ content: newValue, formStatus: "new" });

  const handleNewPhotos = (photos: Photo[]) =>
    photos.forEach(({ id, originalName }) => push({ photoId: id, name: originalName, formStatus: "new" }));

  const handleRemoveDocument = (index: number) => {
    const document = values.documents[index] as AccountDocument & { formStatus: string };
    const isNew = document.formStatus === "new";
    remove(index);
    if (!isNew) {
      setDocumentsForRemove && setDocumentsForRemove((documents: AccountDocument[]) => [...documents, document]);
    }
  };

  const handleDocumentUpdate = (index: number) => () => {
    const isNew = values.documents[index].formStatus === "new";
    return !isNew && setFieldValue(`documents[${index}].formStatus`, "updated");
  };

  useEffect(() => {
    return () => {
      if (setDocumentsForRemove) {
        setDocumentsForRemove([]);
      }
    };
  }, [setDocumentsForRemove]);

  return (
    <Box>
      <AppBar position="static" color="default">
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          disabled={isSubmitting}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {documents.map((document, index) => (
            <Tab key={index} label={getTabLabel(document)} />
          ))}
          <Tab icon={<AddIcon />} />
        </Tabs>
      </AppBar>
      {documents.map((document, index) => (
        <TabPanel value={tab} key={index} index={index}>
          <Box position="relative">
            {!disableIconButton && (
              <StyledIconButton
                onClick={() =>
                  dispatch(
                    dialogsSlice.openDialog(DIALOG.CONFIRMATION, { callback: () => handleRemoveDocument(index) })
                  )
                }
                disabled={isSubmitting}
              >
                <CloseIcon />
              </StyledIconButton>
            )}

            {document.photoId && <RenderKycDocument id={document.photoId} fileName={document.originalName} />}
            {(document.content || document.content === "") && (
              <Field
                name={`documents[${index}].content`}
                onChange={handleDocumentUpdate(index)}
                component={MarkdownField}
              />
            )}
            <Field
              name={`documents[${index}].expiryDate`}
              label="Document expires"
              onChange={handleDocumentUpdate(index)}
              fullWidth={false}
              component={DatePickerField}
            />
          </Box>
        </TabPanel>
      ))}
      <TabPanel value={tab} index={documents.length}>
        <Box minHeight="350px">
          {errors["documents"] && (
            <Box component="p" color="red">
              {errors["documents"] as ReactNode}
            </Box>
          )}
          <Box display="flex" flexDirection="column" marginBottom="16px">
            <ButtonGroup>
              {TYPE_BUTTONS.map(({ label, key }) => (
                <Button
                  disabled={newDocumentType === key || isSubmitting}
                  onClick={() => setNewDocumentType(key)}
                  key={key}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
          {newDocumentType === "photo" && <DropzoneField onChange={handleNewPhotos} />}
          {newDocumentType === "content" && <Mde value="" onChange={handleNewContent} />}
        </Box>
      </TabPanel>
    </Box>
  );
};

export { DocumentsField };
