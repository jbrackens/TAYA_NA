import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";
import CloseIcon from "@material-ui/icons/Close";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/styles";
import { Field, FieldArrayRenderProps } from "formik";
import DatePicker from "../formik-fields/DatePickerField";
import Dropzone from "../formik-fields/DropzoneField";
import Markdown from "../formik-fields/MarkdownField";
import RenderKycDocument from "../formik-fields/components/RenderKycDocument";
import Mde from "../../core/components/mde";
import { openConfirmationDialog } from "../../core/components/confirmation-dialog";
import { AccountDocument, Photo } from "app/types";

const useStyles = makeStyles({
  iconButton: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 9999,
  },
});

const TYPE_BUTTONS = [
  { label: "Document", key: "photo" },
  { label: "Note", key: "content" },
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

const DocumentsField = ({ disableIconButton, arrayHelpers, setDocumentsForRemove }: Props) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [tab, setTab] = useState<number>(0);
  const [newDocumentType, setNewDocumentType] = useState("photo");

  const {
    push,
    remove,
    form: { values, errors, setFieldValue, isSubmitting },
  } = arrayHelpers;

  const documents = (values.documents || []) as AccountDocument[];

  const handleChangeTab = (event: React.ChangeEvent<{}>, newValue: number) => setTab(newValue);

  const handleNewContent = (newValue: string) => push({ content: newValue, formStatus: "new" });

  const handleNewPhotos = (photos: Photo[]) =>
    photos.forEach(({ id, originalName }) => push({ photoId: id, name: originalName, formStatus: "new" }));

  const handleRemoveDocument = (index: number) => () => {
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
              <IconButton
                classes={{ root: classes.iconButton }}
                onClick={() => dispatch(openConfirmationDialog({ callback: handleRemoveDocument(index) }))}
                disabled={isSubmitting}
              >
                <CloseIcon />
              </IconButton>
            )}

            {document.photoId && <RenderKycDocument id={document.photoId} fileName={document.originalName} />}
            {(document.content || document.content === "") && (
              <Field name={`documents[${index}].content`} onChange={handleDocumentUpdate(index)} component={Markdown} />
            )}
            <Field
              name={`documents[${index}].expiryDate`}
              label="Document expires"
              onChange={handleDocumentUpdate(index)}
              fullWidth={false}
              component={DatePicker}
            />
          </Box>
        </TabPanel>
      ))}
      <TabPanel value={tab} index={documents.length}>
        <Box minHeight="350px">
          {errors.documents && (
            <Box component="p" color="red">
              {errors.documents}
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
          {newDocumentType === "photo" && <Dropzone onChange={handleNewPhotos} />}
          {newDocumentType === "content" && <Mde value="" onChange={handleNewContent} />}
        </Box>
      </TabPanel>
    </Box>
  );
};

export default DocumentsField;
