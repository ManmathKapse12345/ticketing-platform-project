const { getOrganizationById, getOrganizationByMemberId, updateOrganizationById, getAllMembersByOrganizationId } = require("../services/organization.service");

const getOrganizationByIdRequest = async (req,res,next) => {
    try {
        const { organizationId } = req.params;
        const organization = await getOrganizationById(organizationId);
        return res.status(200).json({ organization });
    } catch (error) {
        return next(error);
    }
}

const getOrganizationByMemberIdRequest = async (req,res,next) => {
    try {
        const memberId = req.user._id;

        const organization = await getOrganizationByMemberId(memberId);

        return res.status(200).json({ organization });
    } catch (error) {
        return next(error);
    }
}

const updateOrganizationByIdRequest = async (req,res,next) => {
    try {
        const { organizationId } = req.params;
        const data = req.body;

        const updated = await updateOrganizationById(organizationId,data);
        return res.status(200).json({ updated }); 
    } catch (error) {
        next(error);
    }
}

const getAllMembersByOrganizationIdRequest = async (req,res,next) => {
    try {
        const { organizationId } = req.params;
        const members = await getAllMembersByOrganizationId(organizationId);
        return res.status(200).json({ members });
    } catch (error) {
        next(error);
    }
}

module.exports = { getOrganizationByIdRequest, getOrganizationByMemberIdRequest, updateOrganizationByIdRequest, getAllMembersByOrganizationIdRequest };